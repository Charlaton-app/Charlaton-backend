import {
    getRoomAccessForUser,
    getRoomAccessByRoomId,
    createRoomAccess,
    deleteRoomAccess
} from "../controllers/roomAccess.controller";
import { Router } from "express";
import verifyToken from "../middlewares/authentication";

const router = Router();

router.get("/verify/user",verifyToken, getRoomAccessForUser);
router.get("/per-room/:id",verifyToken, getRoomAccessByRoomId);
router.post("/",verifyToken, createRoomAccess);
router.delete("/", verifyToken, deleteRoomAccess);

export default router;

