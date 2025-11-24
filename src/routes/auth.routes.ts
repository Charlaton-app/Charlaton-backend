import { Router } from "express";
import {
  login,
  logout,
  recoverPass,
  resetPass,
  loginOAuth,
  refreshToken,
  signup,
} from "../controllers/auth.controller";
import {
  loginValidation,
  validate,
  signupValidation,
} from "../validators/auth.validator";
import verifyToken from "../middlewares/authentication";

const router = Router();

/**
 * @route POST /auth/login
 * @desc User login
 * @access Public
 * @middleware loginValidation - Validates email format and password presence
 * @middleware validate - Executes validations and returns errors if any exist
 * @body {string} email - User's email
 * @body {string} password - User's password
 * @returns {object} 200 - User authenticated successfully with cookies set
 * @returns {object} 400 - Validation error
 * @returns {object} 401 - Invalid credentials
 * @returns {object} 500 - Server error
 */
router.post("/login", loginValidation, validate, login);
router.post("/login/OAuth", loginValidation, validate, loginOAuth);

/**
 * @route POST /auth/signup
 * @desc Creates a new user account
 * @access Public
 * @middleware signupValidation - Validates email format, password strength, and required fields
 * @middleware validate - Executes validations and returns errors if any exist
 * @body {string} email - User's email address
 * @body {string} password - User's password (min 6 characters)
 * @body {string} [nickname] - User's display name (optional)
 * @body {string} [birth_date] - User's birth date (optional)
 * @body {number} [rolId] - User's role ID (default: 2 for regular user)
 * @body {string} [id] - Firebase UID if user was created in Firebase first (optional)
 * @returns {object} 201 - User created successfully with cookies set
 * @returns {object} 400 - Validation error or email already registered
 * @returns {object} 500 - Server error
 */
router.post("/signup", signupValidation, validate, signup);

/**
 * @route POST /auth/refresh
 * @desc Refreshes access token using refresh token from cookies
 * @access Public (requires valid RefreshToken cookie)
 * @returns {object} 200 - Token refreshed successfully, new AccessToken cookie set
 * @returns {object} 401 - Refresh token not provided
 * @returns {object} 403 - Invalid refresh token or revoked session
 * @returns {object} 500 - Server error
 */
router.post("/refresh", refreshToken);

/**
 * @route POST /auth/logout
 * @desc Logs out user by marking session as revoked
 * @access Protected
 * @middleware verifyToken - Verifies user is authenticated
 * @returns {object} 200 - Session closed successfully, cookies cleared
 * @returns {object} 401 - Not authenticated
 * @returns {object} 500 - Server error
 */
router.post("/logout", verifyToken, logout);

/**
 * @route POST /auth/recover
 * @desc Requests password recovery by sending email with reset token
 * @access Public
 * @body {string} email - Email of user requesting password reset
 * @returns {object} 200 - Email sent if user exists
 * @returns {object} 202 - Generic response to avoid email disclosure (even if email doesn't exist)
 * @returns {object} 400 - Email not provided
 * @returns {object} 500 - Server error
 */
router.post("/recover", recoverPass);

/**
 * @route POST /auth/reset/:token
 * @desc Resets password using token received by email
 * @access Public
 * @param {string} token - Reset token received by email
 * @body {string} password - New password
 * @body {string} confirmPassword - New password confirmation
 * @returns {object} 200 - Password updated successfully
 * @returns {object} 400 - Invalid/expired token, passwords don't match, or invalid password format
 * @returns {object} 500 - Server error
 */
router.post("/reset/:token", resetPass);

export default router;
