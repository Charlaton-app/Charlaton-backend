/**
 * 🎯 OPTIMIZED: User Rooms Controller
 * Get rooms/meetings for a specific user
 * 
 * OPTIMIZATIONS APPLIED:
 * 1. ✅ Aggressive caching (3 min TTL) - reduces repeated scans
 * 2. ✅ Cache per-page results separately
 * 3. ✅ Batch processing for connections
 * 4. ✅ Early filtering to skip non-creator rooms
 * 
 * BEFORE: Scanned ALL rooms + ALL connections on EVERY request
 * AFTER: Cached result per page = dramatically fewer reads
 * 
 * @module controllers/userRooms
 */

import { Request, Response } from "express";
import { db } from "../config/db";
import { cache, CacheKeys } from "../utils/cache";

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

    // 🎯 OPTIMIZATION 1: Cache key includes pagination params
    // This allows caching different pages separately
    const cacheKey = `${CacheKeys.userRooms(userId)}:page:${page}:limit:${limit}`;

    const result = await cache.getOrFetch(
      cacheKey,
      async () => {
        console.log(`[USER-ROOMS] 📚 Fetching rooms for user ${userId}, page ${page}`);

        // Try to get all non-deleted rooms
        const allRoomsSnap = await ROOMS
          .where("deletedAt", "==", null)
          .get();
        
        console.log(`[USER-ROOMS] Found ${allRoomsSnap.size} total rooms to filter`);
        
        const userRooms: any[] = [];
        
        // Filter rooms where user is creator (check both string and number formats)
        const userIdAsNumber = Number(userId);
        const userIdAsString = String(userId);

        // 🎯 OPTIMIZATION 2: Early filtering before fetching connections
        // This reduces the number of connection queries we need to make
        const creatorRooms = allRoomsSnap.docs.filter((roomDoc) => {
          const roomData = roomDoc.data();
          const creatorId = roomData.creatorId;
          return (
            String(creatorId) === userIdAsString || 
            creatorId === userIdAsNumber
          );
        });

        console.log(`[USER-ROOMS] User is creator of ${creatorRooms.length} rooms`);

        // 🎯 OPTIMIZATION 3: Batch process connection queries
        const BATCH_SIZE = 5;
        for (let i = 0; i < creatorRooms.length; i += BATCH_SIZE) {
          const batch = creatorRooms.slice(i, i + BATCH_SIZE);
          
          await Promise.all(
            batch.map(async (roomDoc) => {
              const roomData = roomDoc.data();
              const roomId = roomDoc.id;
              const creatorId = roomData.creatorId;
              const isCreator = 
                String(creatorId) === userIdAsString || 
                creatorId === userIdAsNumber;

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
                      endTime = new Date(connData.leftAt).getTime();
                    } else {
                      endTime = now;
                    }
                    
                    const duration = (endTime - joinedAt) / 1000 / 60;
                    
                    if (duration >= 1 && duration < 1440) {
                      totalDuration += duration;
                      durationCount++;
                    }
                  } catch (e) {
                    console.error(`[USER-ROOMS] Error calculating duration:`, e);
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
            })
          );
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

        const paginatedResult = {
          rooms: paginatedRooms,
          pagination: {
            currentPage: page,
            totalPages,
            totalRooms,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };

        console.log(`[USER-ROOMS] ✅ Returning ${paginatedRooms.length} rooms for page ${page}`);

        return paginatedResult;
      },
      180 // 🎯 3-minute cache TTL for room lists
    );

    res.json(result);
  } catch (error) {
    console.error("[USER-ROOMS] Error fetching user rooms:", error);
    res.status(500).json({ error: "Error al obtener reuniones del usuario" });
  }
};

