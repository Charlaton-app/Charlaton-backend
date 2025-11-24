import { Request, Response } from "express";
import { db } from "../config/db";
import bcrypt from "bcryptjs"; 
import admin from "firebase-admin";

const SALT_ROUNDS = 10;

const verifyUser = async (userId: string, res: Response) => {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return doc;
};

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
      return res.json({ id: doc.id, ...doc.data() });
    }

    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json(users);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("users").doc(id).get();

    if (!doc.exists)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, name, last_name, password, birth_date, rolId } = req.body;
    
    if (!email || !password || !name || !birth_date) {
      return res.status(400).json({ error: "Email y password son requeridos" });
    }

    // Validar si el correo ya existe
    const q = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!q.empty) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const userData = {
      email,
      name:  name,
      last_name: last_name || null,
      password: hashed,
      birth_date: birth_date,
      rolId,
      createdAt: new Date(),
    };

    const created = await db.collection("users").add(userData);
    let doc = await created.get();


    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

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

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, last_name } = req.body;

    const userDoc = await verifyUser(id, res);
    if (!userDoc) return;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (name) updateData.nickname = name;
    if (last_name) updateData.last_name = last_name;
    
    updateData.updatedAt = new Date();

    await db.collection("users").doc(id).update(updateData);

    const updated = await db.collection("users").doc(id).get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

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