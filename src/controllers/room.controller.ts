import { Request, Response } from "express";
import { db } from "../config/db";
import { Serializer } from "v8";

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
      adminsId, // recibe los admins
    } = req.body;

    const newRoomRef = ROOMS.doc();


    const setAdminsId = new Set<String>(adminsId); // crea un conjunto a partir de los admins (que es un json con una lista)
    setAdminsId.add(creatorId); // añade al conjunto el id del creador de la sala

    const roomData = {
      name,
      creatorId,
      password: password ?? null,
      parentRoomId: parentRoomId ?? null,
      private: isPrivate ?? false,
      scheduleAt: scheduleAt ?? null,
      deletedAt: null,
      adminsId: [...setAdminsId], // conjunto de creadores
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

/*
Elimina un admin al grupo de los admins
*/

export const removeAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;         // id de la room
    const { adminToRemove, userId } = req.body; 
    // userId = el que está haciendo la petición

    const roomRef = ROOMS.doc(id);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null) {
      return res.status(404).json({ error: "Sala no encontrada" });
    }

    const roomData = roomDoc.data();
    const admins = roomData?.adminId || [];
    const creatorId = roomData?.creatorId;

    // 1. Validar que SOLO el creador pueda eliminar
    if (userId !== creatorId) {
      return res.status(403).json({ error: "Solo el creador puede eliminar admins" });
    }

    // 2. Evitar que el creador se elimine a sí mismo
    if (adminToRemove === creatorId) {
      return res.status(400).json({ error: "El creador no puede eliminarse a sí mismo" });
    }

    // 3. Convertir a Set y eliminar
    const adminSet = new Set<string>(admins);
    adminSet.delete(adminToRemove);

    await roomRef.update({
      adminId: [...adminSet]
    });

    return res.json({
      success: true,
      adminId: [...adminSet]
    });

  } catch (error) {
    console.error("Error eliminando admin:", error);
    return res.status(500).json({ error: "Error al eliminar admin" });
  }
};


/*
Añade un nuevo admin al grupo de los admins
*/

export const addAdmin = async (req: Request, res: Response) => {

  try{

    const { id } = req.params;
    const { newAdmin } = req.body;

    const roomDoc = await ROOMS.doc(id).get();
    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null)
      return res.status(404).json({ error: "Sala no encontrada" });

    const actualAdmins = roomDoc.data()?.adminId;

    const setActualAdmins = new Set<string>(actualAdmins);

    setActualAdmins.add(newAdmin);

    await ROOMS.doc(id).update({
      adminsId: [...setActualAdmins]
    });

    res.json({ id, ...roomDoc.data()});

  } catch (error){
    console.error("Error actualizando admins:", error);
    res.status(500).json({ error: "Error al actualizar admins" });
  }
};

/**
 * Actualizar sala
 */
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, private: isPrivate, scheduleAt, adminsId } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isPrivate !== undefined) updateData.private = isPrivate;
    if (scheduleAt !== undefined) updateData.scheduleAt = scheduleAt;

    const roomDoc = await ROOMS.doc(id).get();
    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null)
      return res.status(404).json({ error: "Sala no encontrada" });

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
