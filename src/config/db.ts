import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Cargar variables de entorno
dotenv.config();

// Obtener credenciales de Firebase
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Producción: leer desde variable de entorno (JSON como string)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_KEY_PATH) {
  // Desarrollo: leer desde archivo local
  // Resolver la ruta relativa al directorio raíz del proyecto
  const firebaseKeyPath = path.isAbsolute(process.env.FIREBASE_KEY_PATH)
    ? process.env.FIREBASE_KEY_PATH
    : path.resolve(process.cwd(), process.env.FIREBASE_KEY_PATH);
  
  // Verificar que el archivo existe
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const db = admin.firestore();
