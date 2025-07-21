import { Router } from "express";
import dotenv from "dotenv";
import { generateRandomString } from "../utils/randomString";
import { createDoc } from "../handle/firestore";

dotenv.config();

const router = Router();

