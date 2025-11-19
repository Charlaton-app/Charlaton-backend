import { Router } from "express";
import {
  login,
  logout,
  recoverPass,
  resetPass,
  refreshToken
} from "../controllers/auth.controller";
import {
  loginValidation,
  validate,
} from "../validators/auth.validator";
import verifyToken from "../middlewares/authentication";

const router = Router();

router.post("/login", loginValidation, validate, login);
router.post("/refresh", refreshToken);
router.post("/logout", verifyToken, logout);
router.post("/recover", recoverPass);
router.post("/reset/:token", resetPass);

export default router;
