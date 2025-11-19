import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

// Extend Express Request interface to include 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Genera access tokens (válidos por 15 minutos)
export function generateAccessToken(userId: number, email: string) {
  const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
  return jwt.sign({ id: userId, email }, ACCESS_SECRET, { expiresIn: "15m" });
}

// Genera refresh tokens (válidos por 7 días)
export function generateRefreshToken(userId: number) {
  const REFRESH_SECRET = process.env.REFRESH_SECRET as string;
  return jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Middleware para verificar el Access Token desde la cookie "AccessToken".
 */
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extrae el token desde las cookies
    const token = req.cookies.AccessToken;

    if (!token) {
      return res.status(401).json({ message: "Autenticación requerida" });
    }

    // Verifica y decodifica el token con la clave correcta
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET as string);

    // Guarda la info del usuario en el request
    req.user = decoded;

    next();
  } catch (error) {
    if (error && typeof error === "object" && "name" in error) {
      if ((error as { name: string }).name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expirado" });
      } else if ((error as { name: string }).name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Token inválido" });
      }
    }
    return res.status(500).json({ message: "Error de autenticación" });
  }
};

export default verifyToken;
