import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Array de validaciones para el registro de usuario (signup).
 * Valida email, password, edad y opcionalmente nickname según reglas específicas.
 *
 * @type {Array<ValidationChain>}
 * @constant
 *
 * Validation rules:
 * - email: required, valid email format, normalized
 * - password: minimum 6 characters (compatible with Firebase)
 * - edad: required, must be a positive integer
 * - nickname: optional, minimum 2 characters if provided
 * - confirmPassword: must match password if provided
 */
export const signupValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("edad")
    .notEmpty()
    .withMessage("Age (edad) is required")
    .isInt({ min: 1, max: 120 })
    .withMessage("Age must be a valid number between 1 and 120"),

  body("nickname")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Nickname must be at least 2 characters if provided"),

  body("confirmPassword")
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
];

/**
 * Array de validaciones para el inicio de sesión (login).
 * Valida que email y password estén presentes y sean válidos.
 *
 * @type {Array<ValidationChain>}
 * @constant
 *
 * Reglas de validación:
 * - email: requerido, formato email válido
 * - password: requerido
 */
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El correo electrónico es requerido")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido"),

  body("password").notEmpty().withMessage("La contraseña es requerida"),
];

/**
 * Middleware para validar los resultados de las validaciones de express-validator.
 * Si hay errores, devuelve un array con los mensajes de error.
 * Si no hay errores, pasa al siguiente middleware.
 *
 * @param {Request} req - Objeto de solicitud de Express
 * @param {Response} res - Objeto de respuesta de Express
 * @param {NextFunction} next - Función para pasar al siguiente middleware
 * @returns {Response|void} Respuesta JSON con errores si existen, o continúa con next()
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
