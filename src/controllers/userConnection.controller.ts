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
 * Get all connections for a specific room with user data populated
 *
 * @async
 * @param {Request} req - Express request object (roomId in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of connections with user data or error
 */
export const getConnectionsByRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const snap = await ROOMS.doc(roomId).collection("connections").get();

    const connections = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // Fetch user data for each connection
    const USERS = db.collection("users");
    const connectionsWithUsers = await Promise.all(
      connections.map(async (conn: any) => {
        if (!conn.userId) return conn;

        try {
          const userDoc = await USERS.doc(String(conn.userId)).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            return {
              ...conn,
              userId: String(conn.userId), // Ensure userId is string
              roomId,
              user: {
                id: userDoc.id,
                email: userData?.email || null,
                nickname: userData?.nickname || null,
                displayName: userData?.nickname || userData?.email?.split('@')[0] || null,
              },
            };
          }
        } catch (err) {
          console.error(`Error fetching user ${conn.userId}:`, err);
        }

        return conn;
      })
    );

    res.json(connectionsWithUsers);
  } catch (error) {
    console.error("Error in getConnectionsByRoom:", error);
    res.status(500).json({ error: "Error al obtener conexiones" });
  }
};

/**
 * Create or refresh user connection to a room (auxiliary function)
 * If an active connection exists, updates joinedAt timestamp
 * Otherwise, creates a new connection
 *
 * @async
 * @param {any} userId - User ID joining the room
 * @param {any} roomId - Room ID being joined
 * @returns {Promise<object>} Object with user and success status
 */
export const createConnectionAux = async (userId: any, roomId: any) => {
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

      return { user: userId, success: true };
    }

    // Create new connection
    const ref = ROOMS.doc(String(roomId)).collection("connections").doc();

    const newConn = {
      userId: Number(userId),
      joinedAt: new Date().toISOString(),
      leftAt: null,
    };

    await ref.set(newConn);

    return { user: userId, success: true };
  } catch {
    return { user: userId, success: false };
  }
};

/**
 * Mark user exit from room (auxiliary function)
 * Sets leftAt timestamp for active connection
 *
 * @async
 * @param {any} userId - User ID leaving the room
 * @param {any} roomId - Room ID being left
 * @returns {Promise<object>} Object with user and success status
 */
export const leftConnectionAux = async (userId: any, roomId: any) => {
  try {
    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", Number(userId))
      .where("leftAt", "==", null)
      .get();

    if (snap.empty) return { user: userId, success: false };

    const docId = snap.docs[0].id;

    const updated = {
      leftAt: new Date().toISOString(),
    };

    await ROOMS.doc(String(roomId))
      .collection("connections")
      .doc(docId)
      .update(updated);

    return { user: userId, success: true };
  } catch {
    return { user: userId, success: true };
  }
};

/**
 * HTTP Controller: Create or refresh user connection to a room
 *
 * @async
 * @param {Request} req - Express request object (userId and roomId in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with connection data or error
 */
export const createConnection = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

    if (!userId || !roomId) {
      return res.status(400).json({ error: "userId and roomId are required" });
    }

    const result = await createConnectionAux(userId, roomId);

    if (!result.success) {
      return res.status(500).json({ error: "Error al crear conexión" });
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error in createConnection:", error);
    return res.status(500).json({ error: "Error al crear conexión" });
  }
};

/**
 * HTTP Controller: Mark user exit from room
 *
 * @async
 * @param {Request} req - Express request object (userId and roomId in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with success or error
 */
export const leftConnection = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

    if (!userId || !roomId) {
      return res.status(400).json({ error: "userId and roomId are required" });
    }

    const result = await leftConnectionAux(userId, roomId);

    if (!result.success) {
      return res.status(500).json({ error: "Error al salir de la sala" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in leftConnection:", error);
    return res.status(500).json({ error: "Error al salir de la sala" });
  }
};
