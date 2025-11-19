import { Router } from "express";
import {
  getConnectionsByRoom,
  createConnection,
  leftConnection,
} from "../controllers/userConnection.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

router.get("/room/:roomId", verifyToken, getConnectionsByRoom);
router.post("/", verifyToken, createConnection);
router.put("/", verifyToken, leftConnection);

export default router;
