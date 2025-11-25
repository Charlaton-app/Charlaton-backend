/**
 * Message Functions
 * Helper functions for message operations in rooms
 *
 * @module functions/message
 */

import { db } from "../config/db";

/**
 * Get all messages from a room ordered by creation date
 *
 * @async
 * @param {any} roomId - Room ID to get messages from
 * @returns {Promise<object>} Object with messages array, message, and success status
 */
export const getAllMessagesByRoom = async (roomId: any) => {
  try {
    const snap = await db
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .orderBy("createAt", "asc")
      .get();

    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return {
      messages: messages,
      message: "messages retrieved successfully",
      success: true,
    };
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return { messages: null, message: "messages not found", success: false };
  }
};

/**
 * Get all messages from a specific user in a room
 *
 * @async
 * @param {any} userId - User ID to get messages from
 * @param {any} roomId - Room ID to search messages in
 * @returns {Promise<object>} Object with messages array, message, and success status
 */
export const getAllMessageOfUserInRoom = async (userId: any, roomId: any) => {
  try {
    const snap = await db
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .where("userId", "==", userId)
      .get();

    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    if (messages.length === 0)
      return { messages: null, message: "messages not found", success: false };

    return {
      messages: messages,
      message: "messages retrieved successfully",
      success: true,
    };
  } catch (error) {
    console.error("Error retrieving user messages:", error);
    return { messages: null, message: "messages not found", success: false };
  }
};

/**
 * Helper function to check if a message should be sent to a specific user
 * Used for private message routing
 *
 * @param {any[]} target - Array of target user objects
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is in target list
 */
export const sendMessageTo = (target: any[], userId: string): boolean => {
  return target.some((t) => t.userId === userId);
};

/**
 * Create a new message in a room
 * Supports public, private, and group visibility modes
 *
 * @async
 * @param {any} data - Message data object (userId, roomId, content, visibility, target)
 * @returns {Promise<object>} Object with user, message reference, and success status
 */
export const createMessage = async (data: any) => {
  const { userId, roomId, content, visibility, target } = data;
  try {
    const messageRef = await db
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .add({
        userId,
        roomId,
        content,
        visibility: visibility || "public",
        target: target || null,
        createAt: new Date(),
      });

    const message = await messageRef.get();

    return { user: userId, message: message, success: true };
  } catch (error) {
    console.error("Error creating message:", error);
    return { userId: userId, success: false };
  }
};
