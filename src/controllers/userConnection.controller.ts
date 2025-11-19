import { Request, Response } from "express";
import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Obtener conexiones de una sala
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
 * Crear o refrescar conexión
 */
export const createConnection = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

    // Buscar conexión anterior
    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", Number(userId))
      .where("leftAt", "==", null)
      .get();

    if (!snap.empty) {
      // Refrescar conexión existente
      const id = snap.docs[0].id;

      const updated = {
        joinedAt: new Date().toISOString(),
        leftAt: null,
      };

      await ROOMS.doc(String(roomId))
        .collection("connections")
        .doc(id)
        .update(updated);

      return res.status(200).json({ id, ...updated });
    }

    // Crear nueva conexión
    const ref = ROOMS.doc(String(roomId)).collection("connections").doc();

    const newConn = {
      userId: Number(userId),
      joinedAt: new Date().toISOString(),
      leftAt: null,
    };

    await ref.set(newConn);

    res.status(201).json({ id: ref.id, ...newConn });
  } catch {
    res.status(500).json({ error: "Error al crear conexión" });
  }
};

/**
 * Marcar salida de usuario
 */
export const leftConnection = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

    const snap = await ROOMS.doc(String(roomId))
      .collection("connections")
      .where("userId", "==", Number(userId))
      .where("leftAt", "==", null)
      .get();

    if (snap.empty)
      return res.status(404).json({ error: "Conexión no encontrada" });

    const docId = snap.docs[0].id;

    const updated = {
      leftAt: new Date().toISOString(),
    };

    await ROOMS.doc(String(roomId))
      .collection("connections")
      .doc(docId)
      .update(updated);

    res.json({ id: docId, ...updated });
  } catch {
    res.status(500).json({ error: "Error al actualizar conexión" });
  }
};
