// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "../config/db";
import { UserCreateInput, UserResponse } from "../types";
import sendEmail from "../utils/sendEmail";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../middlewares/authentication";

const SALT_ROUNDS = 10;

// Helpers para cookies (mismos nombres que usabas)
const COOKIE_OPTIONS = {
  access: (prod = false) => ({
    httpOnly: true,
    secure: prod,
    sameSite: (prod ? "none" : "lax") as "none" | "lax",
    maxAge: 24 * 60 * 60 * 1000,
  }),
  refresh: (prod = false) => ({
    httpOnly: true,
    secure: prod,
    sameSite: (prod ? "none" : "lax") as "none" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }),
  device: (prod = false) => ({
    httpOnly: true,
    secure: prod,
    sameSite: (prod ? "none" : "lax") as "none" | "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  }),
};


// ---------------------------
// Utility: excludePassword
// ---------------------------
export const excludePassword = async (userDoc: any) => {
  if (!userDoc) return null;
  // userDoc expected to be { id, ...fields }
  const roleId = userDoc.rolId || userDoc.roleId || userDoc.role || null;

  let roleType: string | null = null;
  if (roleId) {
    // roles stored in top-level collection "roles", doc id = roleId (we assume string id)
    try {
      const roleSnap = await db.collection("roles").doc(String(roleId)).get();
      if (roleSnap.exists) {
        const roleData = roleSnap.data();
        roleType = roleData?.type ?? null;
      }
    } catch (err) {
      // ignore, roleType stays null
    }
  }

  return {
    id: userDoc.id,
    email: userDoc.email,
    nickname: userDoc.nickname ?? null,
    role: roleType,
    createdAt: userDoc.createdAt ?? userDoc.createAt ?? null,
    updatedAt: userDoc.updatedAt ?? null,
  };
};

// ---------------------------
// Helper: find session by refreshToken (collectionGroup)
// Returns: { docRef, data, userId }
// ---------------------------
const findSessionByRefreshToken = async (refreshToken: string) => {
  const snap = await db
    .collectionGroup("sessions")
    .where("refreshToken", "==", refreshToken)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  // path like: users/{userId}/sessions/{sessionId}
  const pathParts = doc.ref.path.split("/");
  const userIndex = pathParts.indexOf("users") + 1;
  const userId = pathParts[userIndex];

  return { docRef: doc.ref, data: doc.data(), userId };
};

// ---------------------------
// refreshToken
// ---------------------------
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const tokenFromCookie =
      req.cookies.RefreshToken ||
      req.cookies.refreshToken ||
      req.cookies.refresh ||
      null;

    if (!tokenFromCookie)
      return res.status(401).json({ error: "Missing refresh token" });

    const sessionRecord = await findSessionByRefreshToken(tokenFromCookie);
    if (!sessionRecord)
      return res.status(403).json({ error: "Invalid session" });

    const { data: sessionData } = sessionRecord;
    if (sessionData.revoke)
      return res.status(403).json({ error: "Invalid session" });

    try {
      jwt.verify(tokenFromCookie, process.env.REFRESH_SECRET as string);
    } catch {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Obtener user
    const userDoc = await db.collection("users").doc(sessionRecord.userId).get();
    if (!userDoc.exists)
      return res.status(403).json({ error: "User linked to session not found" });

    const user = { id: userDoc.id, ...(userDoc.data() as any) };

    const newAccessToken = generateAccessToken(user.id, user.email);

    res.cookie("AccessToken", newAccessToken, COOKIE_OPTIONS.access(process.env.NODE_ENV === "production"));

    return res.json({ message: "Token refreshed" });
  } catch (err: any) {
    console.error("Error en refreshToken:", err);
    return res.status(500).json({ error: "Error refreshing token" });
  }
};


// ---------------------------
// login OAuth
// ---------------------------

export const loginOAuth = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body; // Token que envía el frontend
    const deviceId = req.cookies.deviceId || req.cookies.deviceid || crypto.randomUUID();

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    const q = await db.collection("users").where("uid", "==", uid).limit(1).get();
    let user;
    
    if (q.empty) {

      const created = await db.collection("users").add({
        uid,                  // guardamos el uid de Firebase
        email,
        name: name || null,
        birth_date : null,
        rolId: 1,      // default
        createdAt: new Date(),
      });
      const doc = await created.get();
      user = { id: doc.id, ...(doc.data() as any) };
    } else {
      user = { id: q.docs[0].id, ...(q.docs[0].data() as any) };
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    const sessionsColRef = db.collection("users").doc(user.id).collection("sessions");
    const sessionDocId = deviceId;

    const now = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const existingSessionRef = sessionsColRef.doc(sessionDocId);
    const existingSessionSnap = await existingSessionRef.get();

    if (existingSessionSnap.exists) {
      await existingSessionRef.update({
        refreshToken,
        lastUsedAt: admin.firestore.Timestamp.fromDate(now),
        userAgent: req.headers["user-agent"] || "Unknown",
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        revoke: false,
      });
    } else {
      await existingSessionRef.set({
        tokenId: crypto.randomUUID(),
        refreshToken,
        deviceId,
        userAgent: req.headers["user-agent"] || "Unknown",
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        revoke: false,
        createdAt: admin.firestore.Timestamp.fromDate(now),
        lastUsedAt: admin.firestore.Timestamp.fromDate(now),
      });
    }

    const prod = process.env.NODE_ENV === "production";
    res.cookie("AccessToken", accessToken, COOKIE_OPTIONS.access(prod));
    res.cookie("RefreshToken", refreshToken, COOKIE_OPTIONS.refresh(prod));
    res.cookie("deviceId", deviceId, COOKIE_OPTIONS.device(prod));

    const profileComplete = Boolean(user.birthdate);

    if (!profileComplete) {
      // El usuario está logueado pero su perfil está incompleto
      return res.status(200).json({
        status: "profile_incomplete",
        message: "El usuario debe completar su perfil.",
        user,
        required: ["birthdate"],
      });
    }

    return res.status(200).json({
      message: "Inicio de sesión OAuth exitoso",
      user,
    });

  } catch (error) {
    console.error("Error en loginOAuth:", error);
    return res.status(500).json({ error: "Error al iniciar sesión con OAuth" });
  }
};


// ---------------------------
// login
// ---------------------------
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    let deviceId = req.cookies.deviceId || req.cookies.deviceid || undefined;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    // Buscar usuario por email (collection "users")
    const userSnap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnap.empty)
      return res.status(401).json({ error: "Credenciales inválidas" });

    const userDoc = userSnap.docs[0];
    const user = { id: userDoc.id, ...(userDoc.data() as any) };

    // Permitir login con contraseñas OAuth
    // Si la contraseña es OAuth, permitir login directamente (Firebase ya autenticó)
    const isOAuthPassword = password === "GOOGLE_OAUTH_USER" || password === "FACEBOOK_OAUTH_USER";
    let isPasswordValid = false;
    
    if (isOAuthPassword) {
      // Para OAuth, Firebase ya autenticó al usuario, así que permitir login
      // Intentar verificar si la contraseña guardada también es OAuth (puede estar hasheada)
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch {
        // Si falla la comparación, permitir de todas formas porque Firebase autenticó
        isPasswordValid = true;
      }
    } else {
      // Para contraseñas normales, verificar con bcrypt
      isPasswordValid = await bcrypt.compare(password, user.password);
    }
    
    if (!isPasswordValid)
      return res.status(401).json({ error: "Credenciales inválidas" });

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    if (!deviceId) {
      deviceId = crypto.randomUUID();
    }

    const sessionsColRef = db.collection("users").doc(user.id).collection("sessions");
    const sessionDocId = deviceId; // usamos deviceId como id de documento para unicidad por device

    const existingSessionRef = sessionsColRef.doc(sessionDocId);
    const existingSessionSnap = await existingSessionRef.get();

    const now = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    if (existingSessionSnap.exists) {
      await existingSessionRef.update({
        refreshToken,
        lastUsedAt: admin.firestore.Timestamp.fromDate(now),
        userAgent: req.headers["user-agent"] || "Unknown",
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        revoke: false,
      });
    } else {
      await existingSessionRef.set({
        tokenId: crypto.randomUUID(),
        refreshToken,
        deviceId,
        userAgent: req.headers["user-agent"] || "Unknown",
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        revoke: false,
        createdAt: admin.firestore.Timestamp.fromDate(now),
        lastUsedAt: admin.firestore.Timestamp.fromDate(now),
      });
    }

    // Set cookies (nombres iguales a los que usabas)
    const prod = process.env.NODE_ENV === "production";
    res.cookie("AccessToken", accessToken, COOKIE_OPTIONS.access(prod));
    res.cookie("RefreshToken", refreshToken, COOKIE_OPTIONS.refresh(prod));
    res.cookie("deviceId", deviceId, COOKIE_OPTIONS.device(prod));

    return res.status(200).json({
      message: "Inicio de sesión exitoso",
      user: await excludePassword(user),
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

// ---------------------------
// allLogout (eliminar sesión por refreshToken)
// ---------------------------
export const allLogout = async (req: Request, res: Response) => {
  try {
    const tokenFromCookie =
      req.cookies.RefreshToken ||
      req.cookies.refreshToken ||
      req.cookies.refresh ||
      null;

    if (!tokenFromCookie) {
      // limpiamos cookies de todas formas
      const prod = process.env.NODE_ENV === "production";
      res.clearCookie("AccessToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });
      res.clearCookie("RefreshToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });
      return res.json({ message: "Sesión cerrada exitosamente" });
    }

    // Encontrar sesiones con ese refreshToken (collectionGroup)
    const snap = await db
      .collectionGroup("sessions")
      .where("refreshToken", "==", tokenFromCookie)
      .get();

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const prod = process.env.NODE_ENV === "production";
    res.clearCookie("AccessToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });
    res.clearCookie("RefreshToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });

    return res.json({ message: "Sesión cerrada exitosamente" });
  } catch (err: any) {
    console.error("Error en allLogout:", err);
    return res.status(500).json({ error: "Error al cerrar sesión" });
  }
};

// ---------------------------
// logout (marcar revoke = true)
// ---------------------------
export const logout = async (req: Request, res: Response) => {
  try {
    const tokenFromCookie =
      req.cookies.RefreshToken ||
      req.cookies.refreshToken ||
      req.cookies.refresh ||
      null;

    if (!tokenFromCookie) {
      const prod = process.env.NODE_ENV === "production";
      res.clearCookie("AccessToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });
      res.clearCookie("RefreshToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });
      return res.json({ message: "Sesión cerrada exitosamente" });
    }

    const sessionRecord = await findSessionByRefreshToken(tokenFromCookie);
    if (sessionRecord) {
      await sessionRecord.docRef.update({ revoke: true });
    }

    const prod = process.env.NODE_ENV === "production";
    res.clearCookie("AccessToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });
    res.clearCookie("RefreshToken", { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" });

    return res.json({ message: "Sesión cerrada exitosamente" });
  } catch (err: any) {
    console.error("Error en logout:", err);
    return res.status(500).json({ error: "Error al cerrar sesión" });
  }
};

// ---------------------------
// recoverPass
// ---------------------------
export const recoverPass = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "El email es requerido" });

    // Buscar usuario
    const userSnap = await db
      .collection("users")
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();

    if (userSnap.empty) {
      // Se responde igual que antes para no filtrar emails
      return res.status(202).json({
        message: "Si el correo es válido, recibirá instrucciones",
      });
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data() as any;

    const token = generateAccessToken(Number(userId), userData.email);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar en subcolección users/{userId}/passwordResets
    await db
      .collection("users")
      .doc(userId)
      .collection("passwordResets")
      .add({
        token,
        userId,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        used: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      });

    const frontendUrl =
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL_PROD
        : process.env.FRONTEND_URL_DEV;

    const resetUrl = `${frontendUrl}/restablecer?token=${token}`;

    await sendEmail(
      userData.email,
      "Restablecer contraseña",
      `Haz clic en este enlace para restablecer tu contraseña (válido por 15 minutos): ${resetUrl}`
    );

    return res.status(200).json({
      message: "Revisa tu correo para continuar",
    });
  } catch (err: any) {
    console.error("Error en recoverPass:", err);
    return res.status(500).json({ message: "Inténtalo de nuevo más tarde" });
  }
};

// ---------------------------
// resetPass
// ---------------------------
export const resetPass = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword)
      return res.status(400).json({ error: "La contraseña y confirmación son requeridas" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Las contraseñas no coinciden" });

    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]{8,}$/;
    if (!regex.test(password)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial",
      });
    }

    // Buscar el record de passwordReset por token (collectionGroup)
    const snap = await db
      .collectionGroup("passwordResets")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    const resetDoc = snap.docs[0];
    const resetData = resetDoc.data() as any;

    if (resetData.used) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Comprobar expiración (resetData.expiresAt es Timestamp)
    const expiresAt = resetData.expiresAt;
    const expiresAtDate = expiresAt instanceof admin.firestore.Timestamp ? expiresAt.toDate() : new Date(expiresAt);
    if (expiresAtDate < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Hashear nueva contraseña y actualizar usuario
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // resetDoc path: users/{userId}/passwordResets/{docId} -> obtener userId desde resetData.userId
    const userId = resetData.userId;
    if (!userId) {
      // Intentar extraer userId desde path (si no estaba en data)
      const pathParts = resetDoc.ref.path.split("/");
      const userIndex = pathParts.indexOf("users") + 1;
      const maybeUserId = pathParts[userIndex];
      if (!maybeUserId) {
        return res.status(400).json({ message: "Token inválido" });
      }
      // set userId
      // @ts-ignore
      (resetData.userId as string) = maybeUserId;
      // continue
    }

    await db.collection("users").doc(userId).update({
      password: hashedPassword,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
    });

    // Marcar como usado
    await resetDoc.ref.update({ used: true });

    return res.status(200).json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (err: any) {
    console.error("Error en resetPass:", err);
    return res.status(500).json({ message: "Inténtalo de nuevo más tarde" });
  }
};
