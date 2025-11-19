import { Request, Response } from "express";
import prisma from "../config/db";

export const getConnectionsByRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const connection = await prisma.userConnection.findMany({
      where: { roomId: Number(roomId) },
      include: { user: true},
    });
    if (!connection)
      return res.status(404).json({ error: "Conexión no encontrada" });
    res.json(connection);
  } catch {
    res.status(500).json({ error: "Error al obtener conexión" });
  }
};

export const createConnection = async (req: Request, res: Response) => {
  try {
    const { userId, roomId} = req.body;

    const oldConnection = await prisma.userConnection.findFirst({
        where: {userId: userId, roomId: roomId}
    });

    if (oldConnection){
        const updatedConnection = await prisma.userConnection.update({
            where: { id: oldConnection.id },
            data:{
              joinedAt: new Date(),
              leftAt: null
            },
          });
        res.status(201).json(updatedConnection);
    } else {
        const newConnection = await prisma.userConnection.create({
            data: { userId, roomId},
          });
          res.status(201).json(newConnection);
    }

  } catch {
    res.status(500).json({ error: "Error al crear conexión" });
  }
};

export const leftConnection = async (req: Request, res: Response) => {
  try {
    const {userId, roomId} = req.body;

    const connection = await prisma.userConnection.findFirst({
        where: {userId: userId, roomId: roomId}
    });

    if (!connection){
        return res.status(404).json({ error: "Conexión no encontrada" });
    }

    const updatedConnection = await prisma.userConnection.update({
      where: { id: connection.id },
      data:{
        leftAt: new Date()
      },
    });
    res.json(updatedConnection);
  } catch {
    res.status(500).json({ error: "Error al actualizar conexión" });
  }
};


