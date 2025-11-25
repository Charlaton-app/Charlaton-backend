import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes";
import roomRoutes from "./routes/room.routes";
import roomAccessRoutes from "./routes/roomAccess.routes";
import userConnectionRoutes from "./routes/userConnection.routes";
import messageRoutes from "./routes/message.routes";
import authRoutes from "./routes/auth.routes";
import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { db } from "./config/db";
import { createConnection } from "./controllers/userConnection.controller";
import { getRoomAccessForUser } from "./controllers/roomAccess.controller";
import { leftConnection } from "./controllers/userConnection.controller";
import { createMessage, sendMessageTo } from "./controllers/message.controllers";
import { existsAdmin, getAdminsInRoom } from "./functions/room.functions";
import { createRoomAccess } from "./functions/roomAccess.functions";


const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server,  { cors: { origin: "*" } }); // para pruebas con el cors, debe cambiarse

// configuración del servidor websocket

io.use((socket, next) => {
  const { token } = socket.handshake.auth || {};
  if (!token) return next(new Error("Token ausente"));
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET as string) as { id?: string };
    if (!decoded || !decoded.id) return next(new Error("Token inválido"));
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Token inválido"));
  }
});



io.on("connection", async (socket) => {

  socket.on("join_room", async (roomId) => {
  
    try {
      if (!roomId) {
        socket.emit("join_room_error", {
          user:null,
          message: "roomId inválido",
          success: false
        });
        return;
      }    
  
      console.log("usuario intenta entrar...");
  
      const user = socket.data.user;
      const userId = user.id;
      socket.data.userId = userId;
  
      const accessSnap = await getRoomAccessForUser(userId, roomId);
  
      if(!accessSnap.success){
  
        socket.emit("join_room_error", {user: user, message: "usuario sin permisos", success : false});
    
        console.log("Usuario sin permiso...");
    
        socket.disconnect(true);
    
        return;
      }
  
      socket.data.roomId = roomId;
  
      socket.join(roomId);
  
      console.log("usuario ingresa a la sala...");
  
      const connectionSnap = await createConnection(userId, roomId);
  
      if (!connectionSnap.success){
  
        socket.emit("join_room_error",{user:user, message: "error al crear conexión", success: false});
        return;
      } 
  
      socket.emit("join_room_success",{user:user, message: "conectado correctamente", success: true });
      socket.to(roomId).emit("join_room_success",{user:user, message: "acceso exitoso", success: true});

    } catch(error){
      console.error("join_room error:", error);
      socket.emit("join_room_error", { user: null, message: "Error interno", success: false });
    }

   
  });

  socket.on("disconnect", async () => {

    try {

      const userId = socket.data.userId;
      const roomId = socket.data.roomId;
    
      if (userId && roomId) {
        await leftConnection(userId, roomId);
        socket.to(roomId).emit("disconnect", {
          user: socket.data.user,
          message: "usuario desconectado",
          success: true
        });
      }

    } catch(error){
      socket.emit("disconect_error", { user: null, message: "Error interno", success: false });
      console.error("disconnect handler error:", error);
    }

  });
  

  socket.on("send_access", async (roomId) => {

    if (!roomId) return;
    if (!socket.data.userId) return;


    const userId = socket.data.userId;

    const adminsId = await getAdminsInRoom(roomId);

    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return;

    for (const socketId of room) {
      const clientSocket = io.sockets.sockets.get(socketId);
      if (!clientSocket) continue;
  
      if (adminsId.includes(clientSocket.data.userId)) {
        clientSocket.emit("send_access", {
          userId,
          roomId,
          message: "El usuario solicita acceso"
        });
      }
    }
  
  });

  socket.on("grant_access", async ({ roomId, targetUserId }) => {

    if (!roomId) return;
    if (!socket.data.userId) return;

    if (!socket.rooms.has(roomId)) {
      return socket.emit("grant_access_error", {
        success: false,
        message: "Debes estar en la sala para otorgar acceso"
      });
    }    

    const admin = socket.data.user;
    const adminId = admin.id;
    
    const isAdmin = await existsAdmin(roomId, adminId);
    const roomSnap = await db.collection("rooms").doc(roomId).get();
    const creatorId = roomSnap.data()?.creatorId;
    
    if (!isAdmin && adminId !== creatorId) {
      return socket.emit("grant_access_error", {
        success: false,
        message: "No eres admin ni creador"
      });
    }
    
    await createRoomAccess(targetUserId,roomId,adminId); 
    
    const room = io.sockets.adapter.rooms.get(roomId);
    if(!room) return;
    
    for (const socketId of room) {
      const clientSocket = io.sockets.sockets.get(socketId);
      if (!clientSocket) continue;
    
      if (clientSocket.data.userId === targetUserId) {
        clientSocket.emit("access_granted", { // este es el evento que recibe el usuario
          roomId,
          message: "Tu acceso fue aceptado"
        });
      }
    }
    
    socket.emit("grant_access_success", {
      success: true,
      message: "Acceso creado"
    });
  });


  socket.on("message", async (msg, visibility, target) => {

    if (!socket.data.userId) return;
    
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;

    if (visibility !== "public" && visibility !== "private") {
      return socket.emit("message_error", {
        message: "visibility inválida",
        success: false
      });
    }    

    if (!msg || typeof msg !== "string") {
      return socket.emit("message_error", {
        message: "mensaje inválido",
        success: false
      });
    }

    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return;

    if (!socket.rooms.has(roomId)) {
      return socket.emit("message_error", { message: "No estás en la sala", success: false });
    }
    

    const connection = await db.collection("rooms").doc(roomId).collection("connections").where("userId","==",userId).get();

    if(connection.empty){
      socket.emit("message_error", {
        message: "el usuario no tiene conexión activa en la sala",
        success: false
      });
      
      return;
    }

    const data = {
      userId : userId,
      roomId : roomId,
      content : msg,
      visibility : visibility,
      target : target
    };

    const message = await createMessage(data);
    
    if(!message.success){
      socket.to(roomId).emit("message_error",{message:"error", success: false});
      return;
    }

    if(visibility === "public"){
      socket.emit("message_success", { content: msg, success: true, visibility: "public" });
      socket.to(roomId).emit("new_success",{content : msg, success: true, visibility: "public"});
    }

    if(visibility === "private"){
      
      for (const socketId of room) {

        const clientSocket = io.sockets.sockets.get(socketId);
        if (!clientSocket) continue;

        if (sendMessageTo(target, clientSocket.data.userId)) {
      
          clientSocket.emit("message_success", {
            content: msg,
            success: true,
            visibility: "private"
          });
      
        }
      }
    }

  });





  

});

const explicitOrigin = "https://charlaton-frontend.vercel.app";
const allowedOrigins = [
  explicitOrigin,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  "http://localhost:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true}));


// Routes
app.use("/api/user",userRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/access", roomAccessRoutes);
app.use("/api/connection", userConnectionRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/auth", authRoutes);


// home endpoint

app.get("/", (req, res) => {
    res.json({message: "API up"});
});

// Error handler

app.use((req,res) => {
    res.status(404).json({error: "Route not found"});
});


server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



