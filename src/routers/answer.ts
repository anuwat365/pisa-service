import { Router } from "express";
import dotenv from "dotenv";
import { generateRandomString } from "../utils/randomString";
import { createDoc, getDoc } from "../handle/firestore";
import multer from "multer";
import { scanAnswers } from "../handle/scanAnswer";
import { AnswerProps } from "../models/answer";
import { LoginSessionProps } from "../models/login_session";
import { firestore } from "firebase-admin";

const upload = multer({
    storage: multer.memoryStorage()
});


dotenv.config();

const router = Router();

router.post("/scan", upload.array("files"), async (req, res): Promise<any> => {
    const sessionToken = req.cookies.session_token;
    const { userAgent } = req.body;

    try {

        // // Find login session by token and user agent
        const [login_session_doc] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true },
                { field: "user_agent", operator: "==", value: userAgent }
            ]
        });

        const files = req.files as Express.Multer.File[];
        const scanResult: AnswerProps[] = await scanAnswers({ filePaths: files.map(file => file.originalname), ownerUserId: login_session_doc.user_id||"" });

        // Create Firestore documents for each answer
        for (const answer of scanResult) {
            await createDoc<AnswerProps>({
                name: "scanned_answers",
                data: answer
            });
        }

        return res.status(200).json({
            success: true,
            data: scanResult
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

export default router;