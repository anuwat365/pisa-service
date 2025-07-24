import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { firestore } from "firebase-admin";
import { getDoc } from "../handle/firestore";
import { LoginSessionProps } from "../models/login_session";
import { UsersProps } from "../models/users";
import { ScannedAnswerProps } from "../models/scanned_answer";
import events from "../config/eventEmitter";
import { generateRandomString } from "../utils/randomString";

// Map to keep track of connected users {connectId, userId}
const connectingUsers = new Map<string, string>();

// Map to keep track of processing answers {userId, scanning ids}
const processingAnswersMap = new Map<string, string[]>();
// Main idle socket handler
const idle = ({
    io,
    socket
}: {
    io: Server,
    socket: Socket
}) => {
    // Handles "idle:connect" event
    const connect = async ({ connectId }: { connectId: string }) => {
        socket.join(connectId); // Join room

        // Parse cookies from handshake
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            // No cookies, reject connection
            io.to(connectId).emit("idle:connect", {
                success: false,
                message: "No cookies found in the request"
            });
            socket.leave(connectId);
            return;
        }

        const parsedCookies = cookie.parse(cookies);
        const sessionToken = parsedCookies["session_token"];

        // Validate session token
        const [loginSession] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true }
            ]
        });

        if (!loginSession) {
            // Invalid or expired session
            io.to(connectId).emit("idle:connect", {
                success: false,
                message: "Invalid session token or session has expired"
            });
            socket.leave(connectId);
            return;
        }

        // Fetch user info
        const [user] = await getDoc<UsersProps>({
            name: "users",
            condition: [
                { field: "id", operator: "==", value: loginSession.user_id }
            ]
        });

        if (!user) {
            // User not found
            io.to(connectId).emit("idle:connect", {
                success: false,
                message: "User not found"
            });
            socket.leave(connectId);
            return;
        }

        // Prepare user data to send
        const modifiedUser = {
            id: user.id,
            username: user.username,
            handle: user.handle,
            email: user.email
        };

        // Fetch scanned answers (limit 512)
        const scannedAnswers = await getDoc<ScannedAnswerProps>({
            name: "scanned_answers",
            condition: [
                { field: "owner_user_id", operator: "==", value: loginSession.user_id }
            ],
            limit: 512
        });

        // Format scanned answers
        const modifiedScannedAnswers = scannedAnswers.map(answer => ({
            id: answer.id,
            owner_user_id: answer.owner_user_id,
            question_name: answer.question_name,
            student_id: answer.student_id,
            student_name: answer.student_name,
            scanned_at: answer.scanned_at.toDate().toISOString(),
            updated_at: answer.updated_at.toDate().toISOString(),
            answers: answer.answers,
        }));

        // Store connection info
        connectingUsers.set(connectId, loginSession.user_id);

        // Send success response with user and scanned answers
        io.to(connectId).emit("idle:connect", {
            success: true,
            user: modifiedUser,
            scannedAnswers: modifiedScannedAnswers
        });
    };

    const disconnect = ({ connectId }: { connectId: string }) => {
        // Emit disconnect event
        io.to(connectId).emit("idle:disconnect", {
            success: true,
            message: "Disconnected successfully"
        });
        // Remove user from connectingUsers map
        connectingUsers.delete(connectId);
        // Leave the room
        socket.leave(connectId);

    };

    // Handles "idle:start-scanning" event
    const startScanning = ({ userId, scannedAnswerId }: { userId: string, scannedAnswerId: string }) => {
        // Add scannedAnswerId to the user's processing list
        const scans = processingAnswersMap.get(userId) ?? [];
        scans.push(scannedAnswerId);
        processingAnswersMap.set(userId, scans);

        // Find the connectId for this user
        const connectId = [...connectingUsers.entries()].find(([, uid]) => uid === userId)?.[0];
        if (connectId) {
            // Notify client that scanning has started
            io.to(connectId).emit("idle:start-scanning", {
                success: true,
                scanId: scannedAnswerId,
            });
        }
    };

    // Handles "idle:scan-complete" event
    const completeScan = ({ userId, scannedAnswers, scannedAnswerId }: { userId: string; scannedAnswers: ScannedAnswerProps[]; scannedAnswerId: string; }) => {
        // Remove scannedAnswerId from user's processing list
        const currentScans = (processingAnswersMap.get(userId) || []).filter(id => id !== scannedAnswerId);

        // Update or delete the processing list for the user
        if (currentScans.length === 0) {
            processingAnswersMap.delete(userId);
        } else {
            processingAnswersMap.set(userId, currentScans);
        }

        // Prepare scanned answers for client
        const modifiedScannedAnswers = scannedAnswers.map(answer => ({
            id: answer.id,
            owner_user_id: answer.owner_user_id,
            question_name: answer.question_name,
            student_id: answer.student_id,
            student_name: answer.student_name,
            scanned_at: answer.scanned_at.toDate().toISOString(),
            updated_at: answer.updated_at.toDate().toISOString(),
            answers: answer.answers,
        }));

        // Find connectId for user and emit scan complete event
        const connectId = [...connectingUsers.entries()].find(([, uid]) => uid === userId)?.[0];
        if (connectId) {
            io.to(connectId).emit("idle:scan-complete", {
                success: true,
                scannedAnswers: modifiedScannedAnswers,
                scanId: scannedAnswerId,
            });
        }
    };

    events.on("idle:start-scanning", startScanning);
    events.on("idle:scan-complete", completeScan);
    socket.on("idle:connect", connect);
    socket.on("idle:disconnect", disconnect);
};

export default idle;