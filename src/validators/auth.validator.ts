import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

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

export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El correo electrónico es requerido")
    .isEmail()
    .withMessage("Debe proporcionar un correo electrónico válido"),

  body("password").notEmpty().withMessage("La contraseña es requerida"),
];

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
