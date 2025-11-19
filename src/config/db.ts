import admin from "firebase-admin";
import dotenv from "dotenv";

const serviceAccountPath = process.env.FIREBASE_KEY_PATH!;

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

export const db = admin.firestore();
