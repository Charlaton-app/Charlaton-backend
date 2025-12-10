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
 * Includes user information for each connection
 * 
 * @async
 * @param {Request} req - Express request object (roomId in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of connections with user info or error
 */
export const getConnectionsByRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    // Only get ACTIVE connections (leftAt === null)
    const snap = await ROOMS.doc(roomId)
      .collection("connections")
      .where("leftAt", "==", null)
      .get();

    // Get user information for each connection
    const connections = await Promise.all(
      snap.docs.map(async (d) => {
        const connectionData: any = {
          id: d.id,
          ...d.data(),
        };

        // Preserve firebaseUid from connection document
        const firebaseUid = connectionData.firebaseUid;

        // Get user information if userId exists
        const userId = connectionData.userId;
        if (userId !== null && userId !== undefined) {
          try {
            const userIdStr = String(userId);
            const userDoc = await db.collection("users").doc(userIdStr).get();
            
            if (userDoc.exists) {
              const userData = userDoc.data();
              connectionData.user = {
                id: userIdStr,
                email: userData?.email || "",
                nickname: userData?.nickname,
                displayName: userData?.displayName,
              };
            }
          } catch (userError) {
            console.error(`[CONNECTION] Error fetching user ${userId}:`, userError);
          }
        }

        // Ensure userId is string for consistency
        if (connectionData.userId && typeof connectionData.userId === "number") {
          connectionData.userId = String(connectionData.userId);
        }

        // Ensure firebaseUid is included in response
        if (firebaseUid) {
          connectionData.firebaseUid = firebaseUid;
        }

        // Include roomId for reference
        connectionData.roomId = roomId;

        return connectionData;
      })
    );

    res.json(connections);
  } catch (error) {
    console.error("[CONNECTION] Error in getConnectionsByRoom:", error);
    res.status(500).json({ error: "Error al obtener conexiones" });
  }
};

/**
/**
 * Create or refresh user connection to a room (auxiliary function)
 * If an active connection exists, updates joinedAt timestamp
 * Otherwise, creates a new connection
 * 
 * @async
 * @param {any} userId - User ID joining the room
 * @param {any} roomId - Room ID being joined
 * @param {string} [firebaseUid] - Firebase UID for WebRTC mapping
 * @returns {Promise<object>} Object with user and success status
 */
export const createConnectionAux = async (userId: any, roomId: any, firebaseUid?: string) => {
  try {
    // Determine if userId should be stored as string or number
    let userIdToStore: any = userId;
    const userIdAsNumber = Number(userId);
    
    if (!isNaN(userIdAsNumber) && userIdAsNumber.toString() === userId.toString()) {
      userIdToStore = userIdAsNumber;
    } else {
      userIdToStore = String(userId);
    }

    // If firebaseUid not provided, try to get it from user document
    let resolvedFirebaseUid = firebaseUid;
    if (!resolvedFirebaseUid) {
      try {
        const userDoc = await db.collection("users").doc(String(userId)).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          resolvedFirebaseUid = userData?.uid || userData?.firebaseUid;
          if (!resolvedFirebaseUid) {
            console.warn(`[CREATE-CONNECTION-AUX] ⚠️ User doc exists but no firebaseUid field for userId: ${userId}`);
          }
        } else {
          console.warn(`[CREATE-CONNECTION-AUX] ⚠️ User document not found for userId: ${userId}`);
        }
      } catch (err) {
        console.error(`[CREATE-CONNECTION-AUX] ❌ Could not fetch user doc for userId: ${userId}`, err);
      }
    }

    // Search for previous active connection
    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", userIdToStore)
      .where("leftAt", "==", null)
      .get();

    if (!snap.empty) {
      // Refresh existing connection
      const id = snap.docs[0].id;
      const updated: any = {
        joinedAt: new Date().toISOString(),
        leftAt: null,
      };

      // Include firebaseUid if available
      if (resolvedFirebaseUid) {
        updated.firebaseUid = resolvedFirebaseUid;
      } else {
        console.warn(`[CREATE-CONNECTION-AUX] ⚠️ No firebaseUid available for userId: ${userId}`);
      }

      await ROOMS.doc(String(roomId))
        .collection("connections")
        .doc(id)
        .update(updated);

      return {user: userId, success: true};
    }

    // Create new connection
    const ref = ROOMS.doc(String(roomId)).collection("connections").doc();
    const newConn: any = {
      userId: userIdToStore,
      joinedAt: new Date().toISOString(),
      leftAt: null,
    };

    // Include firebaseUid if available
    if (resolvedFirebaseUid) {
      newConn.firebaseUid = resolvedFirebaseUid;
    } else {
      console.warn(`[CREATE-CONNECTION-AUX] ⚠️ No firebaseUid available for userId: ${userId}`);
    }

    await ref.set(newConn);

    return {user: userId, success: true};
  } catch (error) {
    console.error(`[CREATE-CONNECTION-AUX] Error:`, error);
    return {user: userId, success: false};
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
    // Determine userId format (same logic as createConnectionAux)
    let userIdToSearch: any = userId;
    const userIdAsNumber = Number(userId);
    
    if (!isNaN(userIdAsNumber) && userIdAsNumber.toString() === userId.toString()) {
      userIdToSearch = userIdAsNumber;
    } else {
      userIdToSearch = String(userId);
    }

    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", userIdToSearch)
      .where("leftAt", "==", null)
      .get();

    if (snap.empty) {
      console.warn(`[LEFT-CONNECTION-AUX] No active connection found for user ${userId} in room ${roomId}`);
      return {user: userId, success: false};
    }

    const docId = snap.docs[0].id;
    const updated = {
      leftAt: new Date().toISOString(),
    };

    await ROOMS.doc(String(roomId))
      .collection("connections")
      .doc(docId)
      .update(updated);

    return {user: userId, success: true};
  } catch (error) {
    console.error(`[LEFT-CONNECTION-AUX] Error:`, error);
    return {user: userId, success: false};
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
    const { userId, roomId, firebaseUid } = req.body;

    if (!userId || !roomId) {
      return res.status(400).json({ error: "userId and roomId are required" });
    }

    console.log(`[CREATE-CONNECTION] Creating connection for userId: ${userId}, roomId: ${roomId}, firebaseUid: ${firebaseUid || 'not provided'}`);

    const result = await createConnectionAux(userId, roomId, firebaseUid);

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
