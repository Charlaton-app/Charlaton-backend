import { Request, Response } from "express";
import { db } from "../config/db";

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

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { userId, roomId, content, visibility, target } = req.body;

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

    res.status(201).json({ id: message.id, ...message.data() });
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    res.status(500).json({ error: "Error al crear mensaje" });
  }
};

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