import { Request, Response } from "express";
import { db } from "../config/db";
import bcrypt from "bcryptjs";
import admin from "firebase-admin";
import { excludePassword } from "./auth.controller";

const SALT_ROUNDS = 10;

/**
 * Verifica si un usuario existe en la base de datos.
 *
 * @async
 * @param {string} userId - ID del usuario a verificar
 * @param {Response} res - Objeto de respuesta de Express para enviar error si no existe
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot|null>} Documento del usuario si existe, null si no existe
 */
const verifyUser = async (userId: string, res: Response) => {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return doc;
};

/**
 * Controlador para obtener todos los usuarios o buscar un usuario específico por email.
 * Si se proporciona un query parameter 'email', busca solo ese usuario.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (puede contener email en query params)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con el usuario encontrado o lista de todos los usuarios
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (email && typeof email === "string") {
      const snap = await db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const doc = snap.docs[0];
      const userData = { id: doc.id, ...doc.data() };
      const userResponse = await excludePassword(userData);
      return res.json(userResponse);
    }

    const snap = await db.collection("users").get();
    const usersData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const users = await Promise.all(
      usersData.map((user) => excludePassword(user))
    );

    res.json(users);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

/**
 * Controlador para obtener un usuario por su ID.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con los datos del usuario o error si no existe
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("users").doc(id).get();

    if (!doc.exists)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const userData = { id: doc.id, ...doc.data() };
    const userResponse = await excludePassword(userData);

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

/**
 * Controlador para crear un nuevo usuario.
 * Valida que el email no esté registrado, hashea la contraseña y guarda el usuario.
 * Permite especificar un ID personalizado o generar uno automáticamente.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener email, password, y opcionalmente nickname, rolId, id en body)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con los datos del usuario creado
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, nickname, password, edad, rolId } = req.body;

    if (!email || !password || !edad) {
      return res
        .status(400)
        .json({ error: "Email, password y edad son requeridos" });
    }

    // Validar si el correo ya existe
    const q = await db.collection("users").where("email", "==", email).get();

    if (!q.empty) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Convert edad to number if it's a string
    const edadNumber =
      typeof edad === "string" ? parseInt(edad, 10) : Number(edad);
    const rolIdNumber = rolId
      ? typeof rolId === "string"
        ? parseInt(rolId, 10)
        : Number(rolId)
      : 2;

    const userData = {
      email,
      nickname: nickname || null,
      password: hashed,
      edad: edadNumber,
      rolId: rolIdNumber,
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
    };

    const created = await db.collection("users").add(userData);
    let doc = await created.get();
    const userDataResponse = { id: doc.id, ...doc.data() };
    const userResponse = await excludePassword(userDataResponse);

    res.status(201).json(userResponse);
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

/**
 * Controlador para cambiar la contraseña de un usuario.
 * Valida que las contraseñas coincidan, hashea la nueva contraseña y actualiza el usuario.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params, password y confirmPassword en body)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response|void>} Respuesta JSON con mensaje de éxito o error
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      return res.status(400).json({ error: "Different passwords" });

    const userDoc = await verifyUser(id, res);
    if (!userDoc) return;

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    await db.collection("users").doc(id).update({
      password: hashed,
      updatedAt: new Date(),
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
};

/**
 * Controlador para actualizar información de un usuario.
 * Permite actualizar email y nickname. Otros campos se ignoran.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params, email y/o nickname en body)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response|void>} Respuesta JSON con los datos actualizados del usuario
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, nickname, edad } = req.body;

    const userDoc = await verifyUser(id, res);
    if (!userDoc) return;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (nickname) updateData.nickname = nickname;
    if (edad !== undefined) {
      // Convert edad to number if it's a string
      updateData.edad =
        typeof edad === "string" ? parseInt(edad, 10) : Number(edad);
    }

    updateData.updatedAt = admin.firestore.Timestamp.fromDate(new Date());

    await db.collection("users").doc(id).update(updateData);

    const updated = await db.collection("users").doc(id).get();
    const userData = { id: updated.id, ...updated.data() };
    const userResponse = await excludePassword(userData);

    res.json(userResponse);
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

/**
 * Controlador para eliminar un usuario de la base de datos.
 *
 * @async
 * @param {Request} req - Objeto de solicitud de Express (debe contener id en params)
 * @param {Response} res - Objeto de respuesta de Express
 * @returns {Promise<Response>} Respuesta JSON con mensaje de éxito o error
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.collection("users").doc(id).delete();
    await admin.auth().deleteUser(id);

    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};
