// src/controllers/message.controller.ts
import { Request, Response } from "express";
import { db } from "../config/db";

/**
 * Controller to get all messages from a specific room ordered by creation date
 * 
 * @async
 * @param {Request} req - Express request object (roomId in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of messages or error message
 */
export const getAllMessagesByRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

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

    res.json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
};

/**
 * Controller to get all messages from a specific user in a room
 * 
 * @async
 * @param {Request} req - Express request object (userId and roomId in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of user's messages or error
 */
export const getAllMessageOfUserInRoom = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

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
      return res.status(404).json({ error: "Mensaje no encontrado" });

    res.json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes del usuario:", error);
    res.status(500).json({ error: "Error al obtener mensaje" });
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
  return target.some(t => t.userId === userId);
};

/**
 * Controller to create a new message in a room
 * Supports public, private, and group visibility modes
 * 
 * @async
 * @param {any} data - Message data object (userId, roomId, content, visibility, target)
 * @returns {Promise<object>} Object with success status and message data
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

    return {user: userId, message : message, success: true};
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    return {userId: userId, success: false};
  }
};

/**
 * Controller to update the content of an existing message
 * 
 * @async
 * @param {Request} req - Express request object (id in params, content and roomId in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON with updated message or error
 */
export const updateContentMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, roomId } = req.body;

    const messageRef = db
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .doc(id);

    const doc = await messageRef.get();

    if (!doc.exists)
      return res.status(404).json({ error: "Mensaje no encontrado" });

    await messageRef.update({
      content,
      updateAt: new Date(),
    });

    const updated = await messageRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error al actualizar mensaje:", error);
    res.status(500).json({ error: "Error al actualizar mensaje" });
  }
};

/**
 * Controller to delete a message from a room
 * Performs hard delete (complete removal from Firestore)
 * 
 * @async
 * @param {Request} req - Express request object (id in params, roomId in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON success message or error
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roomId } = req.body;

    await db
      .collection("rooms")
      .doc(roomId)
      .collection("messages")
      .doc(id)
      .delete();

    res.json({ message: "Mensaje eliminado" });
  } catch (error) {
    console.error("Error eliminando mensaje:", error);
    res.status(500).json({ error: "Error al eliminar mensaje" });
  }
};