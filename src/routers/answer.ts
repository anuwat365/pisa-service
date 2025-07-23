import { Router } from "express";
import dotenv from "dotenv";
import { generateRandomString } from "../utils/randomString";
import { createDoc, getDoc } from "../handle/firestore";
import multer from "multer";
import { scanAnswers } from "../handle/scanAnswer";
import { ScannedAnswerProps } from "../models/scanned_answer";
import { LoginSessionProps } from "../models/login_session";
import { firestore } from "firebase-admin";
import events from "../config/eventEmitter";


const upload = multer({
    storage: multer.memoryStorage()
});


dotenv.config();

const router = Router();

// Route to handle scanning of answer files
router.post("/scan", upload.array("files"), async (req, res): Promise<any> => {
    // Get session token from cookies
    const sessionToken = req.cookies.session_token;

    // Extract user agent from request body
    const { userAgent } = req.body;

    try {
        // Find login session by token, user agent, and other conditions
        const [login_session_doc] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true },
                { field: "user_agent", operator: "==", value: userAgent }
            ]
        });

        // Get user ID from login session
        const userId = login_session_doc?.user_id || "";

        // Generate a random ID for the scanned answer batch
        const scannedAnswerId = generateRandomString(128);

        // Emit event to signal start of scanning
        events.emit("idle:start-scanning", { userId, scannedAnswerId: scannedAnswerId });

        // Get uploaded files from request
        const files = req.files as Express.Multer.File[];

        // Scan the uploaded answer files
        // const scanResult: ScannedAnswerProps[] = await scanAnswers({
        //     id: scannedAnswerId,
        //     filePaths: files.map(file => file.originalname),
        //     ownerUserId: userId
        // });

        // Create Firestore documents for each scanned answer

        await scanAnswers({
            id: scannedAnswerId,
            filePaths: files.map(file => file.originalname),
            ownerUserId: userId
        }).then(async (items) => {
            for (const answer of items) {
                await createDoc<ScannedAnswerProps>({
                    name: "scanned_answers",
                    data: answer
                });
            }
            events.emit("idle:scan-complete", { userId, scannedAnswers: items });
            return;
        });

        // // Respond with scan results
        // return res.status(200).json({
        //     success: true,
        //     data: scanResult
        // });
    } catch (err) {
        // Log and respond with error
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

export default router;