import { Request, Response } from "express";
import prisma from "../config/db";

export const getRoomAccessForUser = async (req: Request, res: Response) => {
    try {
      const { userId, roomId } = req.body;
      const access = await prisma.roomAccess.findFirst({
        where: { userId: Number(userId), roomId: roomId },
        include: { user: true, room: true },
      });
      if (!access) return res.status(404).json({ error: "Acceso no encontrado" });
      res.json(access);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener acceso" });
    }
  };

export const getRoomAccessByRoomId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const access = await prisma.roomAccess.findMany({
      where: { roomId: Number(id) },
      include: { user: true, room: true },
    });
    if (!access) return res.status(404).json({ error: "Acceso no encontrado" });
    res.json(access);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener acceso" });
  }
};

export const createRoomAccess = async (req: Request, res: Response) => {
  try {
    const { userId, roomId, grantedBy } = req.body;
    const access = await prisma.roomAccess.create({
      data: { userId, roomId, grantedBy },
    });
    res.status(201).json(access);
  } catch (error) {
    res.status(500).json({ error: "Error al crear acceso" });
  }
};

export const deleteRoomAccess = async (req: Request, res: Response) => {
  try {
    const { userId, roomId } = req.body;

    const access = await prisma.roomAccess.findFirst({
        where: {
          userId: Number(userId),
          roomId: Number(roomId)
        }
      });
      
      if (!access) {
        return res.status(404).json({ error: "Acceso no encontrado" });
      }
      
      await prisma.roomAccess.delete({
        where: { id: access.id } 
      });

    res.json({ message: "Acceso eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar acceso" });
  }
};
