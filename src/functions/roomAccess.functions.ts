/**
 * Room Access Functions
 * Helper functions for managing room access permissions
 *
 * @module functions/roomAccess
 */

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

    if (accessSnap.empty) return { userId: userId, success: false };

    const access = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }))[0];

    return { userId: userId, access: access, success: true };
  } catch (error) {
    return { userId: userId, success: false };
  }
};

/**
 * Get all access permissions for a room
 *
 * @async
 * @param {any} roomId - Room ID to get access permissions from
 * @returns {Promise<object>} Object with roomId, message, and success status
 */
export const getRoomAccessByRoomId = async (roomId: any) => {
  try {
    const accessSnap = await ROOMS.doc(roomId).collection("access").get();

    const access = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return {
      roomId: roomId,
      message: "access permissions retrieved successfully",
      success: true,
    };
  } catch (error) {
    return {
      roomId: roomId,
      message: "error retrieving access permissions",
      success: false,
    };
  }
};

/**
 * Create room access permission
 *
 * @async
 * @param {any} userId - User ID to grant access
 * @param {any} roomId - Room ID to grant access to
 * @param {any} grantedBy - Admin/creator ID granting the access
 * @returns {Promise<object>} Object with access ID, data, message, and success status
 */
export const createRoomAccess = async (
  userId: any,
  roomId: any,
  grantedBy: any
) => {
  try {
    const accessRef = ROOMS.doc(String(roomId)).collection("access").doc();

    const accessData = {
      userId: Number(userId),
      grantedBy: Number(grantedBy),
      grantedAt: new Date().toISOString(),
    };

    await accessRef.set(accessData);

    return {
      id: accessRef.id,
      ...accessData,
      message: "room access created successfully",
      success: true,
    };
  } catch (error) {
    return { id: null, message: "error creating access", success: false };
  }
};

/**
 * Delete room access permission
 *
 * @async
 * @param {any} userId - User ID to revoke access from
 * @param {any} roomId - Room ID to revoke access to
 * @returns {Promise<object>} Object with access data, message, and success status
 */
export const deleteRoomAccess = async (userId: any, roomId: any) => {
  try {
    const snap = await ROOMS.doc(String(roomId))
      .collection("access")
      .where("userId", "==", Number(userId))
      .get();

    if (snap.empty)
      return { access: null, message: "error deleting access", success: false };

    const docId = snap.docs[0].id;

    await ROOMS.doc(String(roomId)).collection("access").doc(docId).delete();

    return { access: snap, message: "access deleted", success: true };
  } catch (error) {
    return { access: null, message: "error deleting access", success: false };
  }
};
