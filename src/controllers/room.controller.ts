import { Request, Response } from "express";
import { db } from "../config/db";

/**
 * Referencia a la colección de salas en Firestore.
 * @constant
 * @type {FirebaseFirestore.CollectionReference}
 */
const ROOMS = db.collection("rooms");

/**
 * Controlador para obtener todas las salas que no estén eliminadas.
 * Incluye las subcolecciones subRooms y connections de cada sala.
 *
 * @async
 * @param {Request} _req - Objeto de solicitud de Express (no utilizado)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con array de salas incluyendo sus subRooms y connections
 *
 * @example
 * // Respuesta esperada:
 * [
 *   {
 *     id: "room123",
 *     name: "Sala Principal",
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

      // Obtener subRooms (subcolección)
      const subRoomsSnap = await ROOMS.doc(doc.id).collection("subRooms").get();

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
 * Controlador para obtener una sala específica por su ID.
 * Incluye las subcolecciones subRooms y connections de la sala.
 * Verifica que la sala exista y no esté eliminada (deletedAt === null).
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con los datos de la sala, sus subRooms y connections, o error 404 si no existe
 *
 * @example
 * // GET /rooms/room123
 * // Respuesta:
 * {
 *   id: "room123",
 *   name: "Sala Principal",
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
 * Controlador para crear una nueva sala.
 * Genera un ID automático y establece valores por defecto para campos opcionales.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con los datos de la sala creada (status 201)
 *
 * @property {string} req.body.name - Nombre de la sala (requerido)
 * @property {string} req.body.creatorId - ID del usuario creador (requerido)
 * @property {string} [req.body.password] - Contraseña de la sala (opcional, por defecto null)
 * @property {string} [req.body.parentRoomId] - ID de la sala padre (opcional, por defecto null)
 * @property {boolean} [req.body.private] - Indica si la sala es privada (opcional, por defecto false)
 * @property {string} [req.body.scheduleAt] - Fecha/hora programada (opcional, por defecto null)
 *
 * @example
 * // POST /rooms
 * // Body:
 * {
 *   name: "Nueva Sala",
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
 * Controlador para cambiar la contraseña de una sala.
 * Valida que las contraseñas coincidan antes de actualizar.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params, password y confirmPassword en body)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con mensaje de éxito o error
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
 * Controlador para actualizar los datos de una sala.
 * Solo actualiza los campos proporcionados en el body, ignorando los demás.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con el id y los campos actualizados
 *
 * @property {string} [req.body.name] - Nuevo nombre de la sala
 * @property {boolean} [req.body.private] - Nuevo estado de privacidad
 * @property {string} [req.body.scheduleAt] - Nueva fecha/hora programada
 *
 * @example
 * // PATCH /rooms/room123
 * // Body:
 * {
 *   name: "Sala Actualizada",
 *   private: false
 * }
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
 * Controlador para eliminación lógica (soft delete) de una sala.
 * Marca la sala como eliminada estableciendo deletedAt con la fecha actual,
 * sin borrar físicamente el documento de la base de datos.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con mensaje de éxito o error
 *
 * @example
 * // DELETE /rooms/room123
 * // Respuesta:
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
