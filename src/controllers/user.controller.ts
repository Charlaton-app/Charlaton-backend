import { Request, Response } from "express";
import prisma from "../config/db";
import bcrypt from "bcryptjs"; 

const SALT_ROUNDS = 10;

const verifyUser = async (id: number, res: Response) => {

  const existingUser = await prisma.user.findUnique({
    where: {id: id}
  });

  if (!existingUser){
    return res.status(404).json({ error: "User not found" });
  }
    
}

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { rol: true },
    });
    res.json(users);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { rol: true },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, nickname, password, rolId } = req.body;
    const user = await prisma.user.create({
      data: { email, nickname, password, rolId },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {

    const { id }  = req.params;
    const { password, confirmPassword } = req.body;

    await verifyUser(Number(id), res);

    if(password !== confirmPassword){ 
      return res.status(400).json({
        error: "Different passwords",
      });
    }

    const hashed_password= await bcrypt.hash(password,SALT_ROUNDS);

    const user = await prisma.user.update({
      where: {id: Number(id)},
      data: {
        password: hashed_password
      }
    }); 

    return res.status(200).json({
      message: "user updated success",
      user: user,
    });

  }catch(error){
    console.error("Error while change password: ", error)
    res.status(500).json({ error: "Error changing the password" });

  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, nickname} = req.body;

    await verifyUser(Number(id), res);

    const updateUser: any = {};

    if (email) updateUser.email = email;
    if (nickname) updateUser.nickname = nickname;


    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateUser,
    });
    res.json(user);
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};
