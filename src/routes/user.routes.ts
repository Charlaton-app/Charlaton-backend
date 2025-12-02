import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
} from "../controllers/user.controller";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route GET /users
 * @desc Gets all users or searches for a specific user by email
 * @access Public
 * @query {string} [email] - Email of user to search (optional)
 * @returns {object} 200 - Array of users or specific user if email provided
 * @returns {object} 404 - User not found (when searching by email)
 * @returns {object} 500 - Server error
 */
router.get("/", getAllUsers);

/**
 * @route GET /users/:id
 * @desc Gets a specific user by ID
 * @access Public (for participant enrichment)
 * @param {string} id - ID of user to retrieve
 * @returns {object} 200 - User data
 * @returns {object} 404 - User not found
 * @returns {object} 500 - Server error
 */
router.get("/:id", getUserById);

/**
 * @route POST /users
 * @desc Creates a new user
 * @access Public
 * @body {string} email - User's email (required)
 * @body {string} password - User's password (required)
 * @body {string} [nickname] - Username (optional)
 * @body {string} [rolId] - Assigned role ID (optional)
 * @body {string} [id] - Custom ID for user (optional, auto-generated if not provided)
 * @returns {object} 201 - User created successfully
 * @returns {object} 400 - Email already registered, user already exists, or missing data
 * @returns {object} 500 - Server error
 */
router.post("/", createUser);

/**
 * @route PUT /users/:id
 * @desc Updates user information (email, nickname)
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - ID of user to update
 * @body {string} [email] - New user email
 * @body {string} [nickname] - New user nickname
 * @returns {object} 200 - User updated successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - User not found
 * @returns {object} 500 - Server error
 */
router.put("/:id", verifyToken, updateUser);

/**
 * @route PUT /users/password/:id
 * @desc Changes a user's password
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - User ID
 * @body {string} password - New password
 * @body {string} confirmPassword - New password confirmation
 * @returns {object} 200 - Password updated successfully
 * @returns {object} 400 - Passwords don't match
 * @returns {object} 401 - Not authenticated
 * @returns {object} 404 - User not found
 * @returns {object} 500 - Server error
 */
router.put("/password/:id", verifyToken, changePassword);

/**
 * @route DELETE /users/:id
 * @desc Deletes a user from the database
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @param {string} id - ID of user to delete
 * @returns {object} 200 - User deleted successfully
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.delete("/:id", verifyToken, deleteUser);

export default router;
