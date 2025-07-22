import admin from "firebase-admin";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: "pisa-86624.firebaseapp.com",
    storageBucket: "pisa-86624"
});

export const firestore = admin.firestore();
export const storage = admin.storage().bucket();

// Gemini AI
export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });