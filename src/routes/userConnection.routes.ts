/**
 * User Connection Routes
 * API endpoints for managing user connections/sessions in rooms
 * 
 * @module routes/userConnection
 */

import { Router } from "express";
import {
  getConnectionsByRoom,
  createConnection,
  leftConnection,
} from "../controllers/userConnection.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /connection/room/:roomId
 * @desc Gets all connections for a specific room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} roomId - Room ID to get connections from
 * @returns {object} 200 - Array of connections
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/room/:roomId", verifyToken, getConnectionsByRoom);

/**
 * @route POST /connection
 * @desc Creates or refreshes a user connection to a room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} userId - User ID joining the room
 * @body {string} roomId - Room ID being joined
 * @returns {object} 201 - Connection created or refreshed successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.post("/", verifyToken, createConnection);

/**
 * @route PUT /connection
 * @desc Marks user exit from a room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} userId - User ID leaving the room
 * @body {string} roomId - Room ID being left
 * @returns {object} 200 - Connection ended successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.put("/", verifyToken, leftConnection);

export default router;
