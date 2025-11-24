/**
 * User Connection Functions
 * Helper functions for managing user connections/sessions in rooms
 * 
 * @module functions/userConnection
 */

import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Get all connections for a specific room
 * 
 * @async
 * @param {any} roomId - Room ID to get connections from
 * @returns {Promise<object>} Object with connections array, message, and success status
 */
export const getConnectionsByRoom = async (roomId: any) => {
  try {

    const snap = await ROOMS.doc(roomId).collection("connections").get();

    const connections = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return {connections: connections, message: "connections found", success: true};
  } catch {
    return {message: "connections not found", success: true};
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
 * @returns {Promise<object>} Object with user, connection data, and success status
 */
export const createConnection = async (userId: any , roomId: any) => {
  try {

    // Search for previous connection
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

      return {user: userId, connection: updated, success: true};
    }

    // Create new connection
    const ref = ROOMS.doc(String(roomId)).collection("connections").doc();

    const newConn = {
      userId: Number(userId),
      joinedAt: new Date().toISOString(),
      leftAt: null,
    };

    await ref.set(newConn);

    return {user: userId, connection: newConn, success: true};
  } catch {
    return {user: userId, connection: null, success: false};
  }
};

/**
 * Mark user exit from room
 * Sets leftAt timestamp for active connection
 * 
 * @async
 * @param {any} userId - User ID leaving the room
 * @param {any} roomId - Room ID being left
 * @returns {Promise<object>} Object with user, connection data, and success status
 */
export const leftConnection = async (userId: any, roomId: any) => {
  try {

    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", Number(userId))
      .where("leftAt", "==", null)
      .get();

    if (snap.empty)
      return {user: userId, connection: null, success: false};

    const docId = snap.docs[0].id;

    const updated = {
      leftAt: new Date().toISOString(),
    };

    const update = await ROOMS.doc(String(roomId))
      .collection("connections")
      .doc(docId)
      .update(updated);

    return {user: userId, connection: update, success: true};
  } catch {
    return {user: userId, connection: null, success: true};
  }
};
