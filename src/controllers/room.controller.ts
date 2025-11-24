/**
 * Room Controller
 * Manages meeting rooms including creation, updates, and deletion
 * Handles room admin permissions and sub-rooms
 * 
 * @module controllers/room
 */

import { Request, Response } from "express";
import { db } from "../config/db";
import { Serializer } from "v8";

/**
 * Reference to the rooms collection in Firestore
 * @constant
 * @type {FirebaseFirestore.CollectionReference}
 */
const ROOMS = db.collection("rooms");

/**
 * Controller to get all non-deleted rooms
 * Includes subRooms and connections subcollections for each room
 *
 * @async
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of rooms with their subRooms and connections
 *
 * @example
 * // Expected response:
 * [
 *   {
 *     id: "room123",
 *     name: "Main Room",
 *     creatorId: "user456",
 *     subRooms: [...],
 *     connections: [...]
 *   }
 * ]
 */
export const getAllRooms = async (_req: Request, res: Response) => {
  try {
    const snapshot = await ROOMS.where("deletedAt", "==", null).get();

    const rooms = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Get subRooms (subcollection)
      const subRoomsSnap = await ROOMS.doc(doc.id).collection("subRooms").get();

      const subRooms = subRoomsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Get connections (subcollection)
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
 * Controller to get a specific room by ID
 * Includes subRooms and connections subcollections
 * Verifies room exists and is not deleted (deletedAt === null)
 *
 * @async
 * @param {Request} req - Express request object (must contain id in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with room data, subRooms and connections, or 404 error if not found
 *
 * @example
 * // GET /rooms/room123
 * // Response:
 * {
 *   id: "room123",
 *   name: "Main Room",
 *   creatorId: "user456",
 *   subRooms: [...],
 *   connections: [...]
 * }
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
    const connectionsSnap = await ROOMS.doc(id).collection("connections").get();
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
 * Controller to create a new room
 * Generates automatic ID and sets default values for optional fields
 *
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with created room data (status 201)
 *
 * @property {string} req.body.name - Room name (required)
 * @property {string} req.body.creatorId - Creator user ID (required)
 * @property {string} [req.body.password] - Room password (optional, default null)
 * @property {string} [req.body.parentRoomId] - Parent room ID (optional, default null)
 * @property {boolean} [req.body.private] - Indicates if room is private (optional, default false)
 * @property {string} [req.body.scheduleAt] - Scheduled date/time (optional, default null)
 *
 * @example
 * // POST /rooms
 * // Body:
 * {
 *   name: "New Room",
 *   creatorId: "user123",
 *   password: "secret123",
 *   private: true
 * }
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
      adminsId, // receives the admins
    } = req.body;

    const newRoomRef = ROOMS.doc();


    const setAdminsId = new Set<String>(adminsId); // creates a set from admins (which is a JSON with a list)
    setAdminsId.add(creatorId); // adds creator ID to the set

    const roomData = {
      name,
      creatorId,
      password: password ?? null,
      parentRoomId: parentRoomId ?? null,
      private: isPrivate ?? false,
      scheduleAt: scheduleAt ?? null,
      deletedAt: null,
      adminsId: [...setAdminsId], // set of creators
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
 * Controller to change room password
 * Validates that passwords match before updating
 *
 * @async
 * @param {Request} req - Express request object (must contain id in params, password and confirmPassword in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with success message or error
 *
 * @example
 * // PUT /rooms/room123/password
 * // Body:
 * {
 *   password: "newPassword123",
 *   confirmPassword: "newPassword123"
 * }
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
 * Controller to remove an admin from the admin group
 * Only the room creator can remove admins
 * Creator cannot remove themselves
 * 
 * @async
 * @param {Request} req - Express request object (id in params, adminToRemove and userId in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON with success status and updated admin list or error
 */
export const removeAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;         // room id
    const { adminToRemove, userId } = req.body; 
    // userId = the one making the request

    const roomRef = ROOMS.doc(id);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null) {
      return res.status(404).json({ error: "Sala no encontrada" });
    }

    const roomData = roomDoc.data();
    const admins = roomData?.adminId || [];
    const creatorId = roomData?.creatorId;

    // 1. Validate that ONLY creator can remove admins
    if (userId !== creatorId) {
      return res.status(403).json({ error: "Solo el creador puede eliminar admins" });
    }

    // 2. Prevent creator from removing themselves
    if (adminToRemove === creatorId) {
      return res.status(400).json({ error: "El creador no puede eliminarse a sí mismo" });
    }

    // 3. Convert to Set and remove
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


/**
 * Controller to add a new admin to the admin group
 * 
 * @async
 * @param {Request} req - Express request object (id in params, newAdmin in body)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON with room id and data or error
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
 * Controller to update room data
 * Only updates fields provided in body, ignores others
 *
 * @async
 * @param {Request} req - Express request object (must contain id in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with id and updated fields
 *
 * @property {string} [req.body.name] - New room name
 * @property {boolean} [req.body.private] - New privacy status
 * @property {string} [req.body.scheduleAt] - New scheduled date/time
 *
 * @example
 * // PATCH /rooms/room123
 * // Body:
 * {
 *   name: "Updated Room",
 *   private: false
 * }
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
 * Controller for soft delete of a room
 * Marks room as deleted by setting deletedAt with current date,
 * without physically removing the document from database
 *
 * @async
 * @param {Request} req - Express request object (must contain id in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with success message or error
 *
 * @example
 * // DELETE /rooms/room123
 * // Response:
 * {
 *   message: "Sala eliminada"
 * }
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
