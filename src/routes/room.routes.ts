import { Router } from "express";
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  changePassword
} from "../controllers/room.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

router.get("/", verifyToken, getAllRooms);
router.get("/:id", verifyToken, getRoomById);
router.post("/", verifyToken, createRoom);
router.put("/password/:id", verifyToken, changePassword);
router.put("/:id", verifyToken, updateRoom);
router.delete("/:id", verifyToken, deleteRoom);

export default router;
