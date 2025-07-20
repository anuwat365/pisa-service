import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import router from "./routers/routers";
import { Server, Socket } from "socket.io";
// import onConnection from "./sockets/sockets";
import cookieParser from 'cookie-parser';
dotenv.config();

const port = process.env.PORT;

const corsOptions = {
  origin: [process.env.CLIENT_URL as string],
  credentials: true,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();

// Use cors middleware before other middlewares

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.set("trust proxy", true);

// Use the router
app.use("/", router);

// Handle preflight requests
app.use(cors(corsOptions));
const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: [process.env.CLIENT_URL as string], // Frontend URL
//     credentials: true,
//     methods: ["GET", "POST"],
//   },
//   pingTimeout: 60000,  // Set a higher timeout to prevent premature disconnections
//   pingInterval: 25000, // Adjust the ping interval
// });


// io.on("connection", (socket: Socket) => onConnection(io, socket));

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
