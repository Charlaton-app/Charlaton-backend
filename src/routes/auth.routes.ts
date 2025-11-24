import { Router } from "express";
import {
  login,
  logout,
  recoverPass,
  resetPass,
  loginOAuth,
  refreshToken,
  signup,
} from "../controllers/auth.controller";
import {
  loginValidation,
  validate,
  signupValidation,
} from "../validators/auth.validator";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route POST /auth/login
 * @desc Inicia sesión de usuario
 * @access Público
 * @middleware loginValidation - Valida formato de email y que password esté presente
 * @middleware validate - Ejecuta las validaciones y retorna errores si existen
 * @body {string} email - Email del usuario
 * @body {string} password - Contraseña del usuario
 * @returns {object} 200 - Usuario autenticado exitosamente con cookies establecidas
 * @returns {object} 400 - Error de validación
 * @returns {object} 401 - Credenciales inválidas
 * @returns {object} 500 - Error del servidor
 */
router.post("/login", loginValidation, validate, login);
router.post("/login/OAuth", loginValidation, validate, loginOAuth);

/**
 * @route POST /auth/signup
 * @desc Creates a new user account
 * @access Public
 * @middleware signupValidation - Validates email format, password strength, and required fields
 * @middleware validate - Executes validations and returns errors if any exist
 * @body {string} email - User's email address
 * @body {string} password - User's password (min 6 characters)
 * @body {string} [nickname] - User's display name (optional)
 * @body {string} [birth_date] - User's birth date (optional)
 * @body {number} [rolId] - User's role ID (default: 2 for regular user)
 * @body {string} [id] - Firebase UID if user was created in Firebase first (optional)
 * @returns {object} 201 - User created successfully with cookies set
 * @returns {object} 400 - Validation error or email already registered
 * @returns {object} 500 - Server error
 */
router.post("/signup", signupValidation, validate, signup);

/**
 * @route POST /auth/refresh
 * @desc Refresca el access token usando el refresh token de las cookies
 * @access Público (requiere RefreshToken cookie válido)
 * @returns {object} 200 - Token refrescado exitosamente, nueva cookie AccessToken establecida
 * @returns {object} 401 - Refresh token no proporcionado
 * @returns {object} 403 - Refresh token inválido o sesión revocada
 * @returns {object} 500 - Error del servidor
 */
router.post("/refresh", refreshToken);

/**
 * @route POST /auth/logout
 * @desc Cierra la sesión del usuario marcando la sesión como revocada
 * @access Protegido
 * @middleware verifyToken - Verifica que el usuario esté autenticado
 * @returns {object} 200 - Sesión cerrada exitosamente, cookies eliminadas
 * @returns {object} 401 - No autenticado
 * @returns {object} 500 - Error del servidor
 */
router.post("/logout", verifyToken, logout);

/**
 * @route POST /auth/recover
 * @desc Solicita recuperación de contraseña enviando email con token de restablecimiento
 * @access Público
 * @body {string} email - Email del usuario que solicita recuperar contraseña
 * @returns {object} 200 - Email enviado si el usuario existe
 * @returns {object} 202 - Respuesta genérica para no filtrar emails (aunque el email no exista)
 * @returns {object} 400 - Email no proporcionado
 * @returns {object} 500 - Error del servidor
 */
router.post("/recover", recoverPass);

/**
 * @route POST /auth/reset/:token
 * @desc Restablece la contraseña usando el token recibido por email
 * @access Público
 * @param {string} token - Token de restablecimiento recibido por email
 * @body {string} password - Nueva contraseña
 * @body {string} confirmPassword - Confirmación de la nueva contraseña
 * @returns {object} 200 - Contraseña actualizada exitosamente
 * @returns {object} 400 - Token inválido/expirado, contraseñas no coinciden, o formato de contraseña inválido
 * @returns {object} 500 - Error del servidor
 */
router.post("/reset/:token", resetPass);

export default router;
