import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Obtener conexiones de una sala
 */
export const getConnectionsByRoom = async (roomId: any) => {
  try {

    const snap = await ROOMS.doc(roomId).collection("connections").get();

    const connections = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return {connections: connections, message: "conexiones encontradas", success: true};
  } catch {
    return {message: "conexiones no encontradas", success: true};
  }
};

/**
 * Crear o refrescar conexión
 */
export const createConnection = async (userId: any , roomId: any) => {
  try {

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

      return {user: userId, connection: updated, success: true};
    }

    // Crear nueva conexión
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
 * Marcar salida de usuario
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
