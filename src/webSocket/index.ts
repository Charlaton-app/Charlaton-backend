import { io } from "socket.io-client";
import http from "http";
import jwt from "jsonwebtoken";

const socket = io("http://localhost:3000", {
    auth: {
      token: "AQUÍ_TU_JWT_REAL"
    }
  });