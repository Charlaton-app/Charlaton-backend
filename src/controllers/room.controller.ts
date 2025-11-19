import { Request, Response } from "express";
import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Obtener todas las salas que no estén eliminadas
 */
export const getAllRooms = async (_req: Request, res: Response) => {
  try {
    const snapshot = await ROOMS.where("deletedAt", "==", null).get();

    const rooms = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Obtener subRooms (subcolección)
      const subRoomsSnap = await ROOMS.doc(doc.id)
        .collection("subRooms")
        .get();

      const subRooms = subRoomsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Obtener conexiones (subcolección)
      const connectionsSnap = await ROOMS.doc(doc.id)
        .collection("connections")
        .get();

      const connections = connectionsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      rooms.push({
        id: doc.id,
        ...data,
        subRooms,
        connections,
      });
    }

    res.json(rooms);
  } catch (error) {
    console.error("Error obteniendo salas:", error);
    res.status(500).json({ error: "Error al obtener salas" });
  }
};

/**
 * Obtener sala por ID
 */
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const roomDoc = await ROOMS.doc(id).get();
    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null)
      return res.status(404).json({ error: "Sala no encontrada" });

    // Subrooms
    const subRoomsSnap = await ROOMS.doc(id).collection("subRooms").get();
    const subRooms = subRoomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Connections
    const connectionsSnap = await ROOMS.doc(id)
      .collection("connections")
      .get();
    const connections = connectionsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    res.json({
      id,
      ...roomDoc.data(),
      subRooms,
      connections,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener sala" });
  }
};

/**
 * Crear sala
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const {
      name,
      creatorId,
      password,
      parentRoomId,
      private: isPrivate,
      scheduleAt,
    } = req.body;

    const newRoomRef = ROOMS.doc();

    const roomData = {
      name,
      creatorId,
      password: password ?? null,
      parentRoomId: parentRoomId ?? null,
      private: isPrivate ?? false,
      scheduleAt: scheduleAt ?? null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };

    await newRoomRef.set(roomData);

    res.status(201).json({ id: newRoomRef.id, ...roomData });
  } catch (error) {
    console.error("Error creando sala:", error);
    res.status(500).json({ error: "Error al crear sala" });
  }
};

/**
 * Cambiar password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      return res.status(400).json({ error: "Las contraseñas no coinciden" });

    const roomDoc = await ROOMS.doc(id).get();
    if (!roomDoc.exists)
      return res.status(404).json({ error: "Sala no encontrada" });

    await ROOMS.doc(id).update({ password });

    res.json({ message: "Contraseña actualizada" });
  } catch {
    res.status(500).json({ error: "Error actualizando contraseña" });
  }
};

/**
 * Actualizar sala
 */
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, private: isPrivate, scheduleAt } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isPrivate !== undefined) updateData.private = isPrivate;
    if (scheduleAt !== undefined) updateData.scheduleAt = scheduleAt;

    await ROOMS.doc(id).update(updateData);

    res.json({ id, ...updateData });
  } catch (error) {
    console.error("Error actualizando sala:", error);
    res.status(500).json({ error: "Error al actualizar sala" });
  }
};

/**
 * Eliminación lógica
 */
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await ROOMS.doc(id).update({
      deletedAt: new Date().toISOString(),
    });

    res.json({ message: "Sala eliminada" });
  } catch {
    res.status(500).json({ error: "Error al eliminar sala" });
  }
};
