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
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



