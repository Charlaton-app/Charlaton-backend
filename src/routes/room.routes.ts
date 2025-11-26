import { Router } from "express";
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  changePassword,
  addAdmin,
  removeAdmin,
  endRoom
} from "../controllers/room.controller";
import { getUserRooms } from "../controllers/userRooms.controller";
import { getUserStats } from "../controllers/userStats.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /rooms
 * @desc Gets all non-deleted rooms, including their subRooms and connections
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @returns {object} 200 - Array of rooms with their subcollections
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/", verifyToken, getAllRooms);

/**
 * @route GET /rooms/user/:userId/stats
 * @desc Gets user statistics (meetings, duration, contacts)
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} userId - User ID to get stats for
 * @returns {object} 200 - User statistics
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/user/:userId/stats", verifyToken, getUserStats);

/**
 * @route GET /rooms/user/:userId
 * @desc Gets all rooms where user is creator or has participated (paginated)
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} userId - User ID to get rooms for
 * @query {number} [page=1] - Page number
 * @query {number} [limit=3] - Items per page
 * @returns {object} 200 - Paginated list of user's rooms
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/user/:userId", verifyToken, getUserRooms);

/**
 * @route GET /rooms/:id
 * @desc Gets a specific room by ID, including its subRooms and connections
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - ID of room to retrieve
 * @returns {object} 200 - Room data with its subcollections
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - Room not found or deleted
 * @returns {object} 500 - Server error
 */
router.get("/:id", verifyToken, getRoomById);

/**
 * @route POST /rooms
 * @desc Creates a new room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} name - Room name (required)
 * @body {string} creatorId - Creator user ID (required)
 * @body {string} [password] - Room password (optional)
 * @body {string} [parentRoomId] - Parent room ID (optional)
 * @body {boolean} [private] - Indicates if room is private (optional, default: false)
 * @body {string} [scheduleAt] - Scheduled date/time (optional)
 * @returns {object} 201 - Room created successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.post("/", verifyToken, createRoom);

/**
 * @route PUT /rooms/password/:id
 * @desc Changes a specific room's password
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - Room ID
 * @body {string} password - New password
 * @body {string} confirmPassword - New password confirmation
 * @returns {object} 200 - Password updated successfully
 * @returns {object} 400 - Passwords don't match
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - Room not found
 * @returns {object} 500 - Server error
 */
router.put("/password/:id", verifyToken, changePassword);

/**
 * @route PUT /rooms/:id
 * @desc Updates room data (name, private, scheduleAt)
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - ID of room to update
 * @body {string} [name] - New room name
 * @body {boolean} [private] - New privacy status
 * @body {string} [scheduleAt] - New scheduled date/time
 * @returns {object} 200 - Room updated successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.put("/:id", verifyToken, updateRoom);

/**
 * @route POST /rooms/:id/end
 * @desc Ends a room (sets endedAt timestamp, prevents new joins)
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - ID of room to end
 * @returns {object} 200 - Room ended successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 403 - Not authorized (only creator/admin can end)
 * @returns {object} 500 - Server error
 */
router.post("/:id/end", verifyToken, endRoom);

/**
 * @route DELETE /rooms/:id
 * @desc Performs soft delete of a room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - ID of room to delete
 * @returns {object} 200 - Room deleted successfully (deletedAt updated)
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.delete("/:id", verifyToken, deleteRoom);
router.post("/admin/:id",verifyToken, addAdmin);
router.delete("/admin/:id",verifyToken, removeAdmin);

export default router;
