/**
 * Message Routes
 * API endpoints for managing messages in rooms
 * 
 * @module routes/message
 */

import { Router } from "express";
import {
  getAllMessageOfUserInRoom,
  getAllMessagesByRoom,
  createMessageHTTP,
  updateContentMessage,
  deleteMessage,
} from "../controllers/message.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /message/user/room
 * @desc Gets all messages from a specific user in a room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} userId - User ID to get messages from
 * @body {string} roomId - Room ID to search messages in
 * @returns {object} 200 - Array of user's messages
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - Messages not found
 * @returns {object} 500 - Server error
 */
router.get("/user/room", verifyToken, getAllMessageOfUserInRoom);

/**
 * @route GET /message
 * @desc Gets all messages from a room ordered by creation date (query params: roomId, limit, offset)
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @query {string} roomId - Room ID to get messages from
 * @query {number} [limit=50] - Maximum number of messages to return
 * @query {number} [offset=0] - Offset for pagination
 * @returns {object} 200 - Array of messages
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/", verifyToken, getAllMessagesByRoom);

/**
 * @route GET /message/room/:roomId
 * @desc Gets all messages from a room ordered by creation date
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} roomId - Room ID to get messages from
 * @returns {object} 200 - Array of messages
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.get("/room/:roomId", verifyToken, getAllMessagesByRoom);

/**
 * @route POST /message
 * @desc Creates a new message in a room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @body {string} userId - User ID sending the message
 * @body {string} roomId - Room ID where message is sent
 * @body {string} content - Message content
 * @body {string} [visibility] - Message visibility (public, private, group)
 * @body {array} [target] - Target users for private messages
 * @returns {object} 201 - Message created successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.post("/", verifyToken, createMessageHTTP);

/**
 * @route PUT /message/:id
 * @desc Updates a message's content
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - Message ID to update
 * @body {string} content - New message content
 * @body {string} roomId - Room ID where message is located
 * @returns {object} 200 - Message updated successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - Message not found
 * @returns {object} 500 - Server error
 */
router.put("/:id", verifyToken, updateContentMessage);

/**
 * @route DELETE /message/:id
 * @desc Deletes a message from a room
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - Message ID to delete
 * @body {string} roomId - Room ID where message is located
 * @returns {object} 200 - Message deleted successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.delete("/:id", verifyToken, deleteMessage);

export default router;
