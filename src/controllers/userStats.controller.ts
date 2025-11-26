import { Request, Response } from "express";
import { db } from "../config/db";

const ROOMS = db.collection("rooms");
const USERS = db.collection("users");

/**
 * Compute high‑level statistics for a given user.
 *
 * Metrics:
 * - `meetingsThisMonth`: number of distinct rooms the user has joined
 *   since the first day of the current month.
 * - `totalDuration`: formatted total time spent in meetings.
 * - `activeContacts`: count of unique other users they have shared
 *   a room with.
 *
 * The current implementation scans all non‑deleted rooms and their
 * `connections` sub‑collections. It is optimized for correctness and
 * simplicity rather than raw performance.
 *
 * @param req - Express request (expects `userId` in params).
 * @param res - Express response.
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get current month boundaries
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // SIMPLIFIED: Get all rooms created by user
    const userIdAsNumber = Number(userId);
    const userIdAsString = String(userId);
    
    const allRoomsSnap = await ROOMS
      .where("deletedAt", "==", null)
      .get();

    // Track unique rooms, total duration, and unique contacts
    const roomsThisMonth = new Set<string>();
    const uniqueContacts = new Set<string>();
    let totalDurationMinutes = 0;
    const nowTime = now.getTime();

    for (const roomDoc of allRoomsSnap.docs) {
      const roomData = roomDoc.data();
      const roomId = roomDoc.id;

      try {
        // Get all connections for this room
        const connectionsSnap = await ROOMS.doc(roomId)
          .collection("connections")
          .get();

        let userWasInRoom = false;

        for (const connDoc of connectionsSnap.docs) {
          const connData = connDoc.data();
          const connUserId = String(connData.userId);

          // Check if this connection belongs to the user
          const isUserConnection = 
            connUserId === userIdAsString || 
            connData.userId === userIdAsNumber;

          if (isUserConnection && connData.joinedAt) {
            userWasInRoom = true;
            const joinedAt = new Date(connData.joinedAt);
            const joinedAtTime = joinedAt.getTime();

            // Count rooms this month
            if (joinedAt >= firstDayOfMonth) {
              roomsThisMonth.add(roomId);
            }

            // Calculate duration
            let endTime: number;
            if (connData.leftAt) {
              endTime = new Date(connData.leftAt).getTime();
            } else {
              endTime = nowTime;
            }

            const durationMinutes = (endTime - joinedAtTime) / 1000 / 60;
            
            // Only count reasonable durations (1 min to 24 hours)
            if (durationMinutes >= 1 && durationMinutes < 1440) {
              totalDurationMinutes += durationMinutes;
            }
          }

          // Count other users as contacts
          if (!isUserConnection && connData.userId) {
            uniqueContacts.add(connUserId);
          }
        }
      } catch (e) {
        console.error(`[USER-STATS] Error processing room ${roomId}:`, e);
      }
    }

    // Format total duration
    const totalHours = Math.floor(totalDurationMinutes / 60);
    const totalMinutes = Math.round(totalDurationMinutes % 60);
    const formattedDuration = totalHours > 0 
      ? `${totalHours}h ${totalMinutes}min`
      : `${totalMinutes}min`;

    const stats = {
      meetingsThisMonth: roomsThisMonth.size,
      totalDuration: formattedDuration,
      totalDurationMinutes: Math.round(totalDurationMinutes),
      activeContacts: uniqueContacts.size,
    };

    res.json(stats);
  } catch (error) {
    console.error("[USER-STATS] Error fetching user stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

