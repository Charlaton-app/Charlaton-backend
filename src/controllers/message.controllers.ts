import { Request, Response } from "express";
import prisma from "../config/db";

export const getAllMessagesByRoom = async (req: Request, res: Response) => {
  try {

    const { roomId } = req.params;
    const messages = await prisma.message.findMany({
        where: {
            roomId: Number(roomId)
        },
      include: { user: true },
      orderBy: {createAt: "asc"}
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
};

export const getAllMessageOfUserInRoom = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

    const message = await prisma.message.findMany({
      where: { userId: userId, roomId: roomId }
    });
    if (!message)
      return res.status(404).json({ error: "Mensaje no encontrado" });
    res.json(message);
  } catch {
    res.status(500).json({ error: "Error al obtener mensaje" });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { userId, roomId, content, visibility, target } = req.body;
    const message = await prisma.message.create({
      data: { userId, roomId, content, visibility, target },
    });
    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: "Error al crear mensaje" });
  }
};

export const updateContentMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const message = await prisma.message.update({
      where: { id: Number(id) },
      data:{
        content: content
      },
    });
    res.json(message);
  } catch {
    res.status(500).json({ error: "Error al actualizar mensaje" });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.message.delete({ where: { id: Number(id) } });
    res.json({ message: "Mensaje eliminado" });
  } catch {
    res.status(500).json({ error: "Error al eliminar mensaje" });
  }
};
