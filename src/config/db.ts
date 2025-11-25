/**
 * Firebase Admin SDK configuration module
 * Initializes Firebase Admin and exports Firestore database instance
 *
 * @module config/db
 * @requires firebase-admin
 * @requires dotenv
 * @requires path
 * @requires fs
 */

import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
dotenv.config();

/**
 * Firebase service account credentials
 * Loaded from either environment variable (production) or local file (development)
 * @type {admin.ServiceAccount}
 */
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: read from environment variable (JSON as string)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_KEY_PATH) {
  // Development: read from local file
  // Resolve relative path to project root directory
  const firebaseKeyPath = path.isAbsolute(process.env.FIREBASE_KEY_PATH)
    ? process.env.FIREBASE_KEY_PATH
    : path.resolve(process.cwd(), process.env.FIREBASE_KEY_PATH);

  // Verify that the file exists
  if (!fs.existsSync(firebaseKeyPath)) {
    throw new Error(
      `Firebase key file not found at: ${firebaseKeyPath}\n` +
        `Current working directory: ${process.cwd()}\n` +
        `Make sure FIREBASE_KEY_PATH in .env points to the correct location.`
    );
  }

  serviceAccount = require(firebaseKeyPath);
} else {
  throw new Error(
    "Firebase credentials not found. Set either FIREBASE_SERVICE_ACCOUNT (production) or FIREBASE_KEY_PATH (development)"
  );
}

/**
 * Initialize Firebase Admin SDK with service account credentials
 */
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Firestore database instance
 * Used throughout the application for database operations
 * @type {admin.firestore.Firestore}
 */
export const db = admin.firestore();
