import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

/**
 * Extensión de la interfaz Request de Express para incluir la propiedad 'user'.
 * Permite almacenar información del usuario autenticado en el objeto de solicitud.
 *
 * @global
 * @namespace Express
 * @property {any} user - Información del usuario decodificada del token JWT
 */
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Genera un access token JWT con validez de 15 minutos.
 * El token contiene el ID del usuario y su email.
 *
 * @param {number} userId - ID del usuario
 * @param {string} email - Email del usuario
 * @returns {string} Token JWT firmado con la clave ACCESS_SECRET
 */
export function generateAccessToken(userId: number, email: string) {
  const ACCESS_SECRET = process.env.ACCESS_SECRET as string;
  return jwt.sign({ id: userId, email }, ACCESS_SECRET, { expiresIn: "15m" });
}

/**
 * Genera un refresh token JWT con validez de 7 días.
 * El token contiene únicamente el ID del usuario.
 *
 * @param {number} userId - ID del usuario
 * @returns {string} Token JWT firmado con la clave REFRESH_SECRET
 */
export function generateRefreshToken(userId: number) {
  const REFRESH_SECRET = process.env.REFRESH_SECRET as string;
  return jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Middleware para verificar el Access Token desde la cookie "AccessToken".
 * Valida el token JWT, verifica su autenticidad y vigencia, y adjunta
 * la información del usuario decodificada al objeto request.
 *
 * @param {Request} req - Objeto de solicitud de Express (debe contener AccessToken en cookies)
 * @param {Response} res - Objeto de respuesta de Express
 * @param {NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Response|void} Respuesta JSON con error si el token es inválido/expirado, o continúa con next()
 *
 * @throws {401} Token no proporcionado, expirado o inválido
 * @throws {500} Error interno durante la verificación
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
