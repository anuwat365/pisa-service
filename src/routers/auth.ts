import { Router } from "express";
import dotenv from "dotenv";
import { UsersProps } from "../models/users";
import { createDoc, getDoc, updateDoc } from "../handle/firestore";
import { LoginSessionProps } from "../models/login_session";
import { firestore } from "firebase-admin";
import { generateRandomString } from "../utils/randomString";
import { SignUpSessionProps } from "../models/signup_session";

dotenv.config();

const router = Router();

/**
 * Handles Google authentication flow.
 * - If user exists: creates a new login session.
 * - If user does not exist: creates a sign-up session.
 */
router.post("/google", async (req, res): Promise<any> => {
    const { email, username, userAgent, sessionToken } = req.body;

    try {
        // Validate required fields
        if (!email || !userAgent) {
            return res.status(400).json({
                success: false,
                message: "The requested field is incorrect or incomplete.",
            });
        }

        // Find user by email
        const [user_doc] = await getDoc<UsersProps>({
            name: "users",
            condition: [{
                field: "email",
                operator: "==",
                value: email
            }]
        });

        // Get client IP address
        const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress;

        if (user_doc) {
            // Invalidate previous login session for this user
            await updateDoc<LoginSessionProps>({
                name: "login_session",
                condition: [
                    { field: "session_token", operator: "==", value: sessionToken || "" },
                    { field: "user_id", operator: "==", value: user_doc.id }
                ],
                update: [
                    { field: "is_available", value: false }
                ],
            });

            // Create new login session
            const id = generateRandomString(128);
            const token = generateRandomString(128);

            const newDoc: LoginSessionProps = {
                id: id,
                session_token: token,
                user_id: user_doc.id,
                created_at: firestore.Timestamp.now(),
                expiration_at: firestore.Timestamp.fromMillis(
                    firestore.Timestamp.now().toMillis() + 60 * 24 * 60 * 60 * 1000
                ),
                is_available: true,
                user_agent: userAgent,
                ip_address: ip || ""
            };

            await createDoc<LoginSessionProps>({ name: "login_session", data: newDoc });

            return res.status(200).json({
                success: true,
                message: "User logged in successfully",
                data: {
                    sessionToken: token
                }
            });
        }

        // Create sign-up session for new user
        const id = generateRandomString(128);

        const newSignUpDoc: SignUpSessionProps = {
            id: id,
            email: email,
            username: username && username,
            user_agent: userAgent,
            ip_address: ip || null,
            created_at: firestore.Timestamp.now(),
            expiration_at: firestore.Timestamp.fromMillis(
                firestore.Timestamp.now().toMillis() + 30 * 60 * 1000
            ),
            is_available: true
        };

        await createDoc<SignUpSessionProps>({ name: "sign_up_session", data: newSignUpDoc });

        return res.status(200).json({
            success: true,
            message: "Create new sign up in successfully",
            data: {
                signUpSession: id
            }
        });

    } catch (error) {
        console.error(`Error at continue with google: ${error}`);
        return res.status(500).send("Internal Server Error");
    }
});

/**
 * Retrieves sign-up session data.
 * - Validates session and user agent.
 * - Returns username if session is valid.
 */
router.get("/signup", async (req, res): Promise<any> => {
    const { session, userAgent } = req.query;

    if (!session || !userAgent) {
        return res.status(400).json({
            success: false,
            message: "The requested field is incorrect or incomplete.",
        });
    }

    try {
        // Get client IP address
        const clientIpAddress =
            req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
            req.socket.remoteAddress;

        // Find sign-up session by session ID, expiration, user agent, and IP
        const signUpSessions = await getDoc<SignUpSessionProps>({
            name: "sign_up_session",
            condition: [
                { field: "id", operator: "==", value: session },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true },
                { field: "user_agent", operator: "==", value: userAgent },
                { field: "ip_address", operator: "==", value: clientIpAddress }
            ]
        });

        if (signUpSessions.length > 0) {
            // Invalidate other available sessions for the same email
            await updateDoc<SignUpSessionProps>({
                name: "sign_up_session",
                condition: [
                    { field: "id", operator: "!=", value: session },
                    { field: "email", operator: "==", value: signUpSessions[0].email },
                    { field: "is_available", operator: "==", value: true }
                ],
                update: [
                    { field: "is_available", value: false }
                ]
            });

            return res.status(200).json({
                success: true,
                message: "Get sign up session successfully",
                data: {
                    username: signUpSessions[0].username || ""
                }
            });
        }

        // Session not found or unavailable
        return res.status(200).json({
            success: false,
            message: "Session is unavailable"
        });

    } catch (error) {
        console.error("Error at get sign up session:", error);
        return res.status(500).send("Internal Server Error");
    }
});

/**
 * Creates a new user account.
 * - Validates sign-up session and handle uniqueness.
 * - Creates user and login session.
 */
router.post("/signup", async (req, res): Promise<any> => {
    const { session, username, handle, userAgent } = req.body;

    if (!session || !username || !handle || !userAgent) {
        return res.status(400).json({
            success: false,
            message: "The requested field is incorrect or incomplete.",
        });
    }

    try {
        const ip =
            req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
            req.socket.remoteAddress;

        // Validate sign-up session
        const [signUpSession] = await getDoc<SignUpSessionProps>({
            name: "sign_up_session",
            condition: [
                { field: "id", operator: "==", value: session },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true },
                { field: "user_agent", operator: "==", value: userAgent },
                { field: "ip_address", operator: "==", value: ip },
            ],
        });

        if (!signUpSession) {
            return res.status(200).json({ success: false, message: "Session is unavailable" });
        }

        // Check for duplicate handle
        const [existingHandle] = await getDoc<UsersProps>({
            name: "users",
            condition: [{ field: "handle", operator: "==", value: handle }]
        });

        if (existingHandle) {
            return res.status(200).json({ success: false, message: "Handle is duplicate" });
        }

        // Check if user already exists by email
        const [existingUser] = await getDoc<UsersProps>({
            name: "users",
            condition: [{ field: "email", operator: "==", value: signUpSession.email }],
        });

        if (existingUser) {
            return res.status(200).json({ success: false, message: "Session is unavailable" });
        }

        // Create new user document
        const userId = generateRandomString(128);
        const newUser: UsersProps = {
            id: userId,
            username,
            handle,
            email: signUpSession.email,
            created_at: firestore.Timestamp.now(),
            updated_at: firestore.Timestamp.now(),
        };

        await createDoc({ name: "users", data: newUser });

        // Create login session for new user
        const newSessionToken = generateRandomString(128);
        const loginSession: LoginSessionProps = {
            id: generateRandomString(128),
            session_token: newSessionToken,
            user_id: userId,
            created_at: firestore.Timestamp.now(),
            expiration_at: firestore.Timestamp.fromMillis(
                firestore.Timestamp.now().toMillis() + 60 * 24 * 60 * 60 * 1000 // 60 days
            ),
            is_available: true,
            user_agent: userAgent,
            ip_address: ip || ""
        };

        await createDoc({ name: "login_session", data: loginSession });

        // Mark sign-up session as unavailable
        await updateDoc({
            name: "sign_up_session",
            condition: [
                { field: "id", operator: "==", value: session }
            ],
            update: [
                { field: "is_available", value: false }
            ]
        });

        return res.status(200).json({
            success: true,
            message: "User created and logged in successfully",
            data: { sessionToken: newSessionToken },
        });

    } catch (error) {
        console.error("Error at sign up:", error);
        return res.status(500).send("Internal Server Error");
    }
});

/**
 * Retrieves user data using session token from cookies.
 */
router.post("/", async (req, res): Promise<any> => {
    const sessionToken = req.cookies.session_token;
    const { userAgent } = req.body;

    if (!sessionToken) {
        return res.status(200).json({
            success: false,
            message: "Session is unavailable"
        });
    }

    try {
        // Find login session by token and user agent
        const [login_session_doc] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true },
                { field: "user_agent", operator: "==", value: userAgent }
            ]
        });

        if (!login_session_doc) {
            return res.status(200).json({
                success: false,
                message: "Session is unavailable"
            });
        }

        // Find user by ID from login session
        const [user_doc] = await getDoc<UsersProps>({
            name: "users",
            condition: [
                { field: "id", operator: "==", value: login_session_doc.user_id }
            ]
        });

        if (!user_doc) {
            return res.status(200).json({
                success: false,
                message: "Session is unavailable"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Get auth session is successful",
            data: {
                user: {
                    id: user_doc.id,
                    username: user_doc.username,
                    handle: user_doc.handle,
                    email: user_doc.email,
                }
            }
        });

    } catch (error) {
        console.error("Error at get user data from cookie:", error);
        return res.status(500).send("Internal Server Error");
    }
});

/**
 * Logs out the user by invalidating the login session.
 */
router.post("/logout", async (req, res): Promise<any> => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) {
        return res.status(200).json({
            success: false,
            message: "Session is unavailable"
        });
    }
    try {
        // Find login session by token
        const [login_session_doc] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true }
            ]
        });

        if (!login_session_doc) {
            return res.status(200).json({
                success: false,
                message: "Session is unavailable"
            });
        }

        // Mark login session as unavailable and set ended_at
        await updateDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken }
            ],
            update: [
                { field: "is_available", value: false },
                { field: "ended_at", value: firestore.Timestamp.now() }
            ]
        });

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        console.error("Error at logout:", error);
        return res.status(500).send("Internal Server Error");
    }
});

/**
 * Updates user account data (username and handle).
 * - Validates session.
 * - Checks for handle duplication.
 */
router.post("/update", async (req, res): Promise<any> => {
    const sessionToken = req.cookies.session_token;
    const { username, handle } = req.body;
    if (!sessionToken) {
        return res.status(200).json({
            success: false,
            message: "Session is unavailable"
        });
    }
    try {
        // Find login session by token
        const [login_session_doc] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true }
            ]
        });

        if (!login_session_doc) {
            return res.status(200).json({
                success: false,
                message: "Session is unavailable"
            });
        }

        // Check for duplicate handle (excluding current user)
        const [user_doc] = await getDoc<UsersProps>({
            name: "users",
            condition: [
                { field: "handle", operator: "==", value: handle },
                { field: "id", operator: "!=", value: login_session_doc.user_id }
            ]
        });

        if (user_doc) {
            return res.status(200).json({
                success: false,
                message: "Handle is duplicated"
            });
        }

        // Update username and handle for current user
        await updateDoc<UsersProps>({
            name: "users",
            condition: [
                { field: "id", operator: "==", value: login_session_doc.user_id }
            ],
            update: [
                { field: "username", value: username },
                { field: "handle", value: handle }
            ]
        });

        return res.status(200).json({
            success: true,
            message: "Update account successfull"
        });

    } catch (error) {
        console.error("Error at update account data", error);
        return res.status(500).send("Internal Server Error");
    }
});

export default router;