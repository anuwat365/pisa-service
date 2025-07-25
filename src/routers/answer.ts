import { Router } from "express";
import dotenv from "dotenv";
import { generateRandomString } from "../utils/randomString";
import { createDoc, deleteDoc, getDoc } from "../handle/firestore";
import multer from "multer";
import { scanAnswers } from "../handle/scanAnswer";
import { ScannedAnswerProps } from "../models/scanned_answer";
import { LoginSessionProps } from "../models/login_session";
import { firestore } from "firebase-admin";
import events from "../config/eventEmitter";
import { authMiddleware } from "../middlewares/auth";


const upload = multer({
    storage: multer.memoryStorage()
});


dotenv.config();

const router = Router();

// Route to handle scanning of answer files
router.post("/scan", upload.array("files"), async (req, res) => {
    // Get session token from cookies and user agent from request body
    const sessionToken = req.cookies.session_token;
    const { userAgent } = req.body;

    try {
        // Retrieve the login session from Firestore with multiple conditions
        const [loginSession] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true },
                { field: "user_agent", operator: "==", value: userAgent }
            ]
        });

        // Extract user ID from the login session, or use empty string if not found
        const userId = loginSession?.user_id || "";
        // Generate a random ID for the scanned answer batch
        const scannedAnswerId = generateRandomString(128);
        // Emit event to signal scanning has started
        events.emit("idle:start-scanning", { userId, scannedAnswerId });

        // Get uploaded files from the request
        const files = req.files as Express.Multer.File[];
        // Scan the answers using the provided files and user ID
        const scannedAnswers = await scanAnswers({
            filePaths: files.map(file => file.originalname),
            ownerUserId: userId
        });

        // Store each scanned answer in Firestore
        await Promise.all(scannedAnswers.map(answer =>
            createDoc<ScannedAnswerProps>({ name: "scanned_answers", data: answer })
        ));

        // Emit event to signal scanning is complete
        events.emit("idle:scan-complete", { userId, scannedAnswers, scannedAnswerId });
        // Respond with success
        return res.json({ success: true });
    } catch (error) {
        // Log and respond with error if something goes wrong
        console.error("Error at scanning answers:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Route to handle delete scanned answers
router.post("/delete", authMiddleware, async (req, res) => {
    const { scannedAnswerId } = req.body;

    try {
        // Remove the scanned answer from Firestore
        await deleteDoc<ScannedAnswerProps>({
            name: "scanned_answers",
            id: scannedAnswerId
        });

        // Respond with success
        return res.json({ success: true });
    } catch (error) {
        // Log and respond with error if something goes wrong
        console.error("Error at removing scanned answers:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
export default router;