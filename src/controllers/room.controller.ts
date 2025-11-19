import { Request, Response } from "express";
import prisma from "../config/db";

export const getAllRooms = async (_req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
        where: {deletedAt : {not: null}},
        include: {subRooms: true, connections: true },
    });
    res.json(rooms);
  } catch (error) {
    console.error("Error obteniendo salas:", error);
    res.status(500).json({ error: "Error al obtener salas" });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findFirst({
        where: {        
            AND: [
                { id: Number(id) },
                {deletedAt : {not: null}}
            ],
        },
      include: { subRooms: true, connections: true },
    });
    if (!room) return res.status(404).json({ error: "Sala no encontrada" });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener sala" });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, creatorId, password, parentRoomId, private: isPrivate, scheduleAt } = req.body;
    const room = await prisma.room.create({
      data: {
        name,
        creatorId,
        password,
        parentRoomId,
        private: isPrivate ?? false,
        scheduleAt,
      },
    });
    res.status(201).json(room);
  } catch (error) {
    console.error("Error creando sala:", error);
    res.status(500).json({ error: "Error al crear sala" });
  }
}; 

export const changePassword = async (req : Request, res: Response) => {
    try{

        const { id } = req.params;
        const {password, confirmPassword} = req.body;

        const existingRoom = await prisma.room.findUnique({
            where:{id: Number(id)}
        });
    
        if(!existingRoom){
            res.status(404).json({error: "Room not found"});
        }
        
        if(password !== confirmPassword){
            res.status(401).json({error: "different passwords"});
        }

        const updateRoom = await prisma.room.update({
            where: {id : Number(id)},
            data:{
                password: password
            }
        });

        res.json(updateRoom);
    

    }catch(error){
        console.log("Error changing password");
        res.status(401).json({error : "Error changing the room password"});

    }
}

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {name, private: isPrivate, scheduleAt} = req.body;

    const existingRoom = await prisma.room.findUnique({
        where:{id: Number(id)}
    });

    if(!existingRoom){
        res.status(404).json({error: "Room not found"})
    }

    const updateRoom:any = {}
    if (name) updateRoom.name = name;
    if (isPrivate) updateRoom.private = isPrivate;
    if (scheduleAt) updateRoom.scheduleAt = scheduleAt;

    const room = await prisma.room.update({
      where: { id: Number(id) },
      data : updateRoom,
    });
    res.json(room);
  } catch (error) {
    console.error("Error actualizando sala:", error);
    res.status(500).json({ error: "Error al actualizar sala" });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.room.update({ 
        where: { id: Number(id) },
        data:{
            deletedAt: new Date()
        }
    });
    res.json({ message: "Sala eliminada" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar sala" });
  }
};
