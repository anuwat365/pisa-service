import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { firestore } from "firebase-admin";
import { getDoc } from "../handle/firestore";
import { LoginSessionProps } from "../models/login_session";
import { UsersProps } from "../models/users";
import { ScannedAnswerProps } from "../models/scanned_answer";
const idle = ({
    io,
    socket
}: {
    io: Server,
    socket: Socket
}) => {
    const connect = async ({ connectId }: { connectId: string }) => {
        socket.join(connectId);

        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            io.to(connectId).emit("idle:connect", {
                success: false,
                message: "No cookies found in the request"
            });
            socket.leave(connectId);
            return;
        }

        const parsedCookies = cookie.parse(cookies);
        const sessionToken = parsedCookies["session_token"];

        const [login_session_doc] = await getDoc<LoginSessionProps>({
            name: "login_session",
            condition: [
                { field: "session_token", operator: "==", value: sessionToken || "" },
                { field: "expiration_at", operator: ">=", value: firestore.Timestamp.now() },
                { field: "is_available", operator: "==", value: true }
            ]
        });

        if (!login_session_doc) {
            io.to(connectId).emit("idle:connect", {
                success: false,
                message: "Invalid session token or session has expired"
            });
            socket.leave(connectId);
            return;
        }

        const [user_doc] = await getDoc<UsersProps>({
            name: "users",
            condition: [
                { field: "id", operator: "==", value: login_session_doc.user_id }
            ]
        });

        if (!user_doc) {
            io.to(connectId).emit("idle:connect", {
                success: false,
                message: "User not found"
            });
            socket.leave(connectId);
            return;
        }

        const modifiedUser = {
            id: user_doc.id,
            username: user_doc.username,
            handle: user_doc.handle,
            email: user_doc.email
        }

        const scanned_answers: ScannedAnswerProps[] = await getDoc<ScannedAnswerProps>({
            name: "scanned_answers",
            condition: [
                { field: "owner_user_id", operator: "==", value: login_session_doc.user_id }
            ]
            ,
            limit: 128
        });

        const modifiedScannedAnswers = scanned_answers.map(answer => ({
               id: answer.id,
               owner_user_id:answer.owner_user_id,
               question_name: answer.question_name,
               student_id: answer.student_id,
               student_name: answer.student_name,
               scanned_at: answer.scanned_at.toDate().toISOString(),
               updated_at: answer.updated_at.toDate().toISOString(),
               answers: answer.answers,
        }));

        console.log("Session Token:", sessionToken);

        io.to(connectId).emit("idle:connect", {
            success: true,
            user: modifiedUser,
            scannedAnswers: modifiedScannedAnswers
        });
    }

    /** SOCKET EVENTS */
    socket.on("idle:connect", connect);
}

export default idle;