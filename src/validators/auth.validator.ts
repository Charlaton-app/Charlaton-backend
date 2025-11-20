import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Array de validaciones para el registro de usuario (signup).
 * Valida nickname, email, password y confirmPassword según reglas específicas.
 *
 * @type {Array<ValidationChain>}
 * @constant
 *
 * Reglas de validación:
 * - nickname: requerido, mínimo 2 caracteres
 * - email: requerido, formato email válido, normalizado
 * - password: mínimo 8 caracteres, debe contener mayúscula, minúscula, número y carácter especial
 * - confirmPassword: debe coincidir con password
 */
export const signupValidation = [
  body("nickname")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("El correo electrónico es requerido")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]{8,}$/
    )
    .withMessage(
      "La contraseña debe contener al menos una mayúscula y un carácter especial"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Las contraseñas no coinciden");
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
