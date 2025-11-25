/**
 * Room Access Routes
 * API endpoints for managing room access permissions
 * 
 * @module routes/roomAccess
 */

import {
    getRoomAccessForUser,
    getRoomAccessByRoomId,
    createRoomAccess,
    deleteRoomAccess
} from "../controllers/roomAccess.controller";
import { Router } from "express";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /access/verify/user
 * @desc Verifies if a user has access to a specific room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @query {string} userId - User ID to check
 * @query {string} roomId - Room ID to verify access to
 * @returns {object} 200 - User access data if exists
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - Access not found
 * @returns {object} 500 - Server error
 */
router.get("/verify/user",verifyToken, getRoomAccessForUser);

/**
 * @route GET /access/per-room/:id
 * @desc Gets all access permissions for a specific room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - Room ID to get access permissions from
 * @returns {object} 200 - Array of access permissions
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/per-room/:id",verifyToken, getRoomAccessByRoomId);

/**
 * @route POST /access
 * @desc Creates a new room access permission
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} userId - User ID to grant access
 * @body {string} roomId - Room ID to grant access to
 * @body {string} grantedBy - Admin/creator ID granting the access
 * @returns {object} 201 - Access created successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 403 - Only admins can grant access
 * @returns {object} 404 - Room not found
 * @returns {object} 500 - Server error
 */
router.post("/",verifyToken, createRoomAccess);

/**
 * @route DELETE /access
 * @desc Deletes a room access permission
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} userId - User ID to revoke access from
 * @body {string} roomId - Room ID to revoke access to
 * @body {string} grantedBy - Admin/creator ID revoking the access
 * @returns {object} 200 - Access deleted successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 403 - Only admins can revoke access
 * @returns {object} 404 - Access or room not found
 * @returns {object} 500 - Server error
 */
router.delete("/", verifyToken, deleteRoomAccess);

export default router;

