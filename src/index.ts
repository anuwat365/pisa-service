import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import router from "./routers/routers";
import cookieParser from "cookie-parser";

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

// Start server
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
