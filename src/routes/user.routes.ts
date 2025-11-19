import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from "../controllers/user.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

router.get("/", getAllUsers);
router.get("/:id", verifyToken, getUserById);
router.post("/", createUser);
router.put("/:id", verifyToken, updateUser);
router.put("/password/:id", verifyToken, changePassword);
router.delete("/:id", verifyToken, deleteUser);

export default router;
