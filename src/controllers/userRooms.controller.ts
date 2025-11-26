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

    // Try to get all non-deleted rooms
    const allRoomsSnap = await ROOMS
      .where("deletedAt", "==", null)
      .get();
    
    const userRooms: any[] = [];
    
    // Filter rooms where user is creator (check both string and number formats)
    const userIdAsNumber = Number(userId);
    const userIdAsString = String(userId);

    // Process all rooms and filter by creator
    for (const roomDoc of allRoomsSnap.docs) {
      const roomData = roomDoc.data();
      const roomId = roomDoc.id;
      
      // Check if user is creator (handle both string and number)
      const creatorId = roomData.creatorId;
      const isCreator = 
        String(creatorId) === userIdAsString || 
        creatorId === userIdAsNumber;
      
      if (!isCreator) continue;

      // Get connections count for this room (faster with limit)
      const connectionsSnap = await ROOMS.doc(roomId)
        .collection("connections")
        .limit(50) // Limit to avoid fetching too many
        .get();

      // Get unique participants
      const participantIds = new Set();
      connectionsSnap.docs.forEach((doc) => {
        const connData = doc.data();
        if (connData.userId) {
          participantIds.add(String(connData.userId));
        }
      });

      // Calculate duration from ALL connections (active and completed)
      let totalDuration = 0;
      let durationCount = 0;
      const now = new Date().getTime();

      connectionsSnap.docs.forEach((doc) => {
        const connData = doc.data();
        if (connData.joinedAt) {
          try {
            const joinedAt = new Date(connData.joinedAt).getTime();
            let endTime: number;
            
            if (connData.leftAt) {
              // Completed connection
              endTime = new Date(connData.leftAt).getTime();
            } else {
              // Active connection - use current time
              endTime = now;
            }
            
            const duration = (endTime - joinedAt) / 1000 / 60; // minutes
            
            // Only count reasonable durations (1 min to 24 hours)
            if (duration >= 1 && duration < 1440) {
              totalDuration += duration;
              durationCount++;
            }
          } catch (e) {
            // Ignore invalid dates
            console.error(`[USER-ROOMS] Error calculating duration for connection:`, e);
          }
        }
      });

      const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

      const roomInfo = {
        id: roomId,
        name: roomData.name || "Reunión sin nombre",
        createdAt: roomData.createAt || roomData.createdAt,
        participants: participantIds.size,
        duration: avgDuration,
        isCreator,
      };
      
      userRooms.push(roomInfo);
    }

    // Sort by creation date (most recent first)
    userRooms.sort((a, b) => {
      const dateA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const dateB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    // Apply pagination
    const totalRooms = userRooms.length;
    const totalPages = Math.ceil(totalRooms / limit);
    const paginatedRooms = userRooms.slice(skip, skip + limit);

    res.json({
      rooms: paginatedRooms,
      pagination: {
        currentPage: page,
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

