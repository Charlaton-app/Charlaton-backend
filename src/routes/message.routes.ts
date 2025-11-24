import { Router } from "express";
import {
  getAllMessageOfUserInRoom,
  getAllMessagesByRoom,
  createMessage,
  updateContentMessage,
  deleteMessage,
} from "../controllers/message.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

router.get("/user/room", verifyToken, getAllMessageOfUserInRoom);
router.get("/room/:roomId", verifyToken, getAllMessagesByRoom);
router.post("/", verifyToken, createMessage);
router.put("/:id", verifyToken, updateContentMessage);
router.delete("/:id", verifyToken, deleteMessage);

export default router;
