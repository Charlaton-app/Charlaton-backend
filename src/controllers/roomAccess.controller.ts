/**
 * Room Access Controller
 * Handles user access permissions for rooms
 * 
 * @module controllers/roomAccess
 */

import { Request, Response } from "express";
import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Get room access for a specific user
 * 
 * @async
 * @param {any} userId - User ID to check access
 * @param {any} roomId - Room ID to verify access to
 * @returns {Promise<object>} Object with userId, access data, and success status
 */
export const getRoomAccessForUser = async (userId: any, roomId: any) => {
  try {

    const accessSnap = await ROOMS.doc(String(roomId))
      .collection("access")
      .where("userId", "==", Number(userId))
      .get();

    if (accessSnap.empty)
      return {userId: userId, success: false};

    const access = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }))[0];

    return {userId: userId,access: access, success: true};
  } catch (error) {
    return {userId: userId, success: false};
  }
};

/**
 * Get all access permissions for a specific room
 * 
 * @async
 * @param {Request} req - Express request object (id in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of access permissions or error
 */
export const getRoomAccessByRoomId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessSnap = await ROOMS.doc(id).collection("access").get();

    const access = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json(access);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener accesos" });
  }
};

/**
 * Create room access permission
 * Only admins and room creator can grant access
 * 
 * @async
 * @param {Request} req - Express request object (userId, roomId, grantedBy in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON with created access data or error
 */
export const createRoomAccess = async (req: Request, res: Response) => {
  try {
    const { userId, roomId, grantedBy } = req.body;

    const roomRef = ROOMS.doc(roomId);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null) {
      return res.status(404).json({ error: "Sala no encontrada" });
    }

    const roomData = roomDoc.data();
    const creatorId = roomData?.creatorId;
    const adminsId = roomData?.adminsId;

    if (!adminsId.includes(grantedBy) && grantedBy !== creatorId) {
      return res.status(403).json({ error: "Solo los admins pueden dar acceso" });
    }

    const accessRef = ROOMS.doc(String(roomId))
      .collection("access")
      .doc();

    const accessData = {
      userId: Number(userId),
      grantedBy: Number(grantedBy),
      grantedAt: new Date().toISOString(),
    };

    await accessRef.set(accessData);

    res.status(201).json({
      id: accessRef.id,
      ...accessData,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al crear acceso" });
  }
};

/**
 * Delete room access permission
 * Only admins and room creator can revoke access
 * 
 * @async
 * @param {Request} req - Express request object (userId, roomId, grantedBy in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON success message or error
 */

export const deleteRoomAccess = async (req: Request, res: Response) => {
  try {
    const { userId, roomId, grantedBy } = req.body;

    const roomRef = ROOMS.doc(roomId);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null) {
      return res.status(404).json({ error: "Sala no encontrada" });
    }

    const roomData = roomDoc.data();
    const creatorId = roomData?.creatorId;
    const adminsId = roomData?.adminsId;

    if (!adminsId.includes(grantedBy) && grantedBy !== creatorId) {
      return res.status(403).json({ error: "Solo los admins eliminar un acceso" });
    }

    const snap = await ROOMS.doc(String(roomId))
      .collection("access")
      .where("userId", "==", Number(userId))
      .get();

    if (snap.empty)
      return res.status(404).json({ error: "Acceso no encontrado" });

    const docId = snap.docs[0].id;

    await ROOMS.doc(String(roomId)).collection("access").doc(docId).delete();

    res.json({ message: "Acceso eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar acceso" });
  }
};
