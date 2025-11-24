/**
 * User Connection Controller
 * Manages user connections/sessions in rooms (join/leave tracking)
 * 
 * @module controllers/userConnection
 */

import { Request, Response } from "express";
import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Get all connections for a specific room
 * 
 * @async
 * @param {Request} req - Express request object (roomId in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of connections or error
 */
export const getConnectionsByRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const snap = await ROOMS.doc(roomId).collection("connections").get();

    const connections = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    res.json(connections);
  } catch {
    res.status(500).json({ error: "Error al obtener conexiones" });
  }
};

/**
 * Create or refresh user connection to a room
 * If an active connection exists, updates joinedAt timestamp
 * Otherwise, creates a new connection
 * 
 * @async
 * @param {any} userId - User ID joining the room
 * @param {any} roomId - Room ID being joined
 * @returns {Promise<object>} Object with user and success status
 */
export const createConnection = async (userId: any , roomId: any) => {
  try {

    // Search for previous active connection
    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", Number(userId))
      .where("leftAt", "==", null)
      .get();

    if (!snap.empty) {
      // Refresh existing connection
      const id = snap.docs[0].id;

      const updated = {
        joinedAt: new Date().toISOString(),
        leftAt: null,
      };

      await ROOMS.doc(String(roomId))
        .collection("connections")
        .doc(id)
        .update(updated);

      return {user: userId, success: true};
    }

    // Create new connection
    const ref = ROOMS.doc(String(roomId)).collection("connections").doc();

    const newConn = {
      userId: Number(userId),
      joinedAt: new Date().toISOString(),
      leftAt: null,
    };

    await ref.set(newConn);

    return {user: userId, success: true};
  } catch {
    return {user: userId, success: false};
  }
};

/**
 * Mark user exit from room
 * Sets leftAt timestamp for active connection
 * 
 * @async
 * @param {any} userId - User ID leaving the room
 * @param {any} roomId - Room ID being left
 * @returns {Promise<object>} Object with user and success status
 */
export const leftConnection = async (userId: any, roomId: any) => {
  try {

    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", Number(userId))
      .where("leftAt", "==", null)
      .get();

    if (snap.empty)
      return {user: userId, success: false};

    const docId = snap.docs[0].id;

    const updated = {
      leftAt: new Date().toISOString(),
    };

    await ROOMS.doc(String(roomId))
      .collection("connections")
      .doc(docId)
      .update(updated);

    return {user: userId, success: true};
  } catch {
    return {user: userId, success: true};
  }
};
