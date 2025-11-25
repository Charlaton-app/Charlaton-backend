/**
 * Room Functions
 * Helper functions for room operations and admin management
 * 
 * @module functions/room
 */

import { db } from "../config/db";

const ROOMS = db.collection("rooms");

/**
 * Verify if a room has an admin with a specific ID
 * 
 * @async
 * @param {string} roomId - Room ID to check
 * @param {string} adminId - Admin ID to verify
 * @returns {Promise<boolean>} True if admin exists in room, false otherwise
 */
export const existsAdmin = async (roomId: string, adminId: string): Promise<boolean> => {
    try {
      const roomDoc = await ROOMS.doc(roomId).get();
  
      // Room not found or deleted
      if (!roomDoc.exists || roomDoc.data()?.deletedAt !== null) {
        return false;
      }
  
      const admins = roomDoc.data()?.adminId || [];
  
      // Convert to Set for O(1) lookup
      const adminSet = new Set<string>(admins);
  
      return adminSet.has(adminId);
  
    } catch (error) {
      console.error("Error verifying admin:", error);
      return false;
    }
  };

/**
 * Get all admins in a room
 * 
 * @async
 * @param {string} roomId - Room ID to get admins from
 * @returns {Promise<number[]>} Array of admin IDs, empty array if room not found
 */
export const getAdminsInRoom = async (roomId: string) => {
    const roomSnap = await db.collection("rooms").doc(roomId).get();
    if (!roomSnap.exists) return [];
  
    const adminIds: number[] = roomSnap.data()?.adminsId || [];
  
    return [...adminIds]; 
  };
  
  
  