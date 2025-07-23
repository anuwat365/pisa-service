import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import router from "./routers/routers";
import cookieParser from "cookie-parser";
import { Server, Socket } from "socket.io";
import onConnection from "./sockets/socket";

// Load environment variables from .env file
dotenv.config();

const port = process.env.PORT;

// CORS configuration
const corsOptions = {
  origin: [process.env.CLIENT_URL as string],
  credentials: true,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();

// Middleware setup
app.use(cookieParser()); // Parse cookies
app.use(cors(corsOptions)); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.set("trust proxy", true); // Trust proxy headers

// Main router
app.use("/", router);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL as string], // Frontend URL
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,  // Set a higher timeout to prevent premature disconnections
  pingInterval: 25000, // Adjust the ping interval
});

io.on("connection", (socket: Socket) => onConnection(io, socket));

// Start server
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
