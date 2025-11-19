import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { UserCreateInput, UserResponse } from "../types";
import sendEmail from "../utils/sendEmail";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../middlewares/authentication";

const SALT_ROUNDS = 10;

// Función para excluir campos sensibles
export const excludePassword = async (user: any) => {

  const role = await prisma.rol.findUnique({ where: { id: user.roleId } });
  const data = {
    "id": user.id,
    "email": user.email,
    "nickname": user.nickname,
    "role": role?.type,
    "createdAt": user.createdAt,
    "updatedAt": user.updatedAt

  };
  return data;
};

export const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken)
    return res.status(401).json({ error: "Missing refresh token" });

  const session = await prisma.userSection.findFirst({
    where: { refreshToken },
    include: { user: true },
  });

  if (!session) return res.status(403).json({ error: "Invalid session" });

  if (session.revoke) return res.status(403).json({ error: "Invalid session" });

  try {
    jwt.verify(refreshToken, process.env.REFRESH_SECRET as string);
  } catch {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  const newAccessToken = generateAccessToken(
    session.user.id,
    session.user.email
  );

  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  res.json({ message: "Token refreshed" });
};


export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    let { deviceId } = req.cookies;

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    if (!deviceId) {
      deviceId = crypto.randomUUID();
    }

    const existingSession = await prisma.userSection.findUnique({
      where: {
        userId_deviceId: { userId: user.id, deviceId },
      },
    });

    if (existingSession) {
      await prisma.userSection.update({
        where: { userId_deviceId: { userId: user.id, deviceId } },
        data: {
          refreshToken,
          lastUsedAt: new Date(),
          userAgent: req.headers["user-agent"] || "Unknown",
          ip: req.ip || "unknown",
        },
      });
    } else {
      await prisma.userSection.create({
        data: {
          tokenId: crypto.randomUUID(),
          refreshToken,
          deviceId,
          userAgent: req.headers["user-agent"] || "Unknown",
          ip: req.ip || "unknown",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          userId: user.id,
        },
      });
    }

    res.cookie("AccessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 día
    });

    res.cookie("RefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.cookie("deviceId", deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 año
    });

    return res.status(200).json({
      message: "Inicio de sesión exitoso",
      user: await excludePassword(user),
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

export const allLogout = (req: Request, res: Response) => {
  prisma.userSection.deleteMany({
    where: { refreshToken: req.cookies.RefreshToken },
  });

  res.clearCookie("AccessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.clearCookie("RefreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.json({ message: "Sesión cerrada exitosamente" });
};

export const logout = (req: Request, res: Response) => {
  prisma.userSection.update({
    where: { refreshToken: req.cookies.RefreshToken },
    data: {
      revoke: true,
    },
  });

  res.clearCookie("AccessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.clearCookie("RefreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.json({ message: "Sesión cerrada exitosamente" });
};

export const recoverPass = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "El email es requerido" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(202).json({
        message: "Si el correo es válido, recibirá instrucciones",
      });
    }

    const token = generateAccessToken(user.id, user.email);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const frontendUrl =
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL_PROD
        : process.env.FRONTEND_URL_DEV;

    const resetUrl = `${frontendUrl}/restablecer?token=${token}`;

    await sendEmail(
      user.email,
      "Restablecer contraseña",
      `Haz clic en este enlace para restablecer tu contraseña (válido por 1 hora): ${resetUrl}`
    );

    return res.status(200).json({
      message: "Revisa tu correo para continuar",
    });
  } catch (error) {
    console.error("Error en recoverPass:", error);
    return res.status(500).json({
      message: "Inténtalo de nuevo más tarde",
    });
  }
};

export const resetPass = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        error: "La contraseña y confirmación son requeridas",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Las contraseñas no coinciden",
      });
    }

    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]{8,}$/;
    if (!regex.test(password)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial",
      });
    }

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.used ||
      resetRecord.expiresAt < new Date()
    ) {
      return res.status(400).json({
        message: "Token inválido o expirado",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    return res.status(200).json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("Error en resetPass:", error);
    return res.status(500).json({
      message: "Inténtalo de nuevo más tarde",
    });
  }
};

