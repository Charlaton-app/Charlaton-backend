import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes";
import roomRoutes from "./routes/room.routes";
import roomAccessRoutes from "./routes/roomAccess.routes";
import userConnectionRoutes from "./routes/userConnection.routes";
import messageRoutes from "./routes/message.routes";
import authRoutes from "./routes/auth.routes";


const app = express();
const PORT = process.env.PORT ||3000


app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        optionSuccessStatus: 200 
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



