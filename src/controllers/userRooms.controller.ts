/**
 * User Rooms Controller
 * Get rooms/meetings for a specific user
 * 
 * @module controllers/userRooms
 */

import { Request, Response } from "express";
import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Get rooms where user is creator or has participated
 * Includes pagination support
 * 
 * @async
 * @param {Request} req - Express request object (userId in params, page & limit in query)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with paginated rooms
 */
export const getUserRooms = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 3;
    const skip = (page - 1) * limit;

    /**
     * Nueva implementación “ligera”:
     * - Ya NO escaneamos todas las rooms de la colección.
     * - NO leemos la subcolección `connections` (participantes / duración serán ficticios).
     * - Sólo buscamos salas donde el usuario es creador.
     */

    const userIdAsString = String(userId);

    // Buscar rooms donde el usuario es creador
    const roomsSnap = await ROOMS.where("creatorId", "==", userIdAsString).get();

    const userRooms: any[] = [];

    for (const roomDoc of roomsSnap.docs) {
      const roomData = roomDoc.data();

      // Ignorar rooms soft-deleted si el campo existe
      if (roomData.deletedAt !== undefined && roomData.deletedAt !== null) {
        continue;
      }

      const roomInfo = {
        id: roomDoc.id,
        name: roomData.name || "Reunión sin nombre",
        createdAt: roomData.createAt || roomData.createdAt || null,
        // Datos ficticios para evitar lecturas extra:
        participants: 0,
        duration: 0,
        isCreator: true,
      };

      userRooms.push(roomInfo);
    }

    // Ordenar por fecha de creación (más reciente primero) si hay timestamp
    userRooms.sort((a, b) => {
      const dateA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const dateB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    // Paginación en memoria
    const totalRooms = userRooms.length;
    const totalPages = Math.max(1, Math.ceil(totalRooms / limit));
    const paginatedRooms = userRooms.slice(skip, skip + limit);

    res.json({
      rooms: paginatedRooms,
      pagination: {
        currentPage: Math.min(page, totalPages),
        totalPages,
        totalRooms,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[USER-ROOMS] Error fetching user rooms:", error);
    res.status(500).json({ error: "Error al obtener reuniones del usuario" });
  }
};

