import { Request, Response, NextFunction } from "express";
import { getDoc } from "../handle/firestore";
import { LoginSessionProps } from "../models/login_session";
import { firestore } from "firebase-admin";


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const sessionToken = req.cookies.session_token;

    if (!sessionToken) {
        res.status(200).json({
            success: false,
            message: "Session is unavailable"
        });
    }
    const [login_session_doc] = await getDoc<LoginSessionProps>({
        name: "login_session",
        condition: [
            { field: "session_token", operator: "==", value: sessionToken || "" },
            { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
            { field: "is_available", operator: "==", value: true }
        ]
    });

    if (!login_session_doc) {
        res.status(200).json({
            success: false,
            message: "Session is unavailable"
        });
    }

    next();
};