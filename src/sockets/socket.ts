import { Server, Socket } from "socket.io";
import idle from "./idle";

const onConnection = (io: Server, socket: Socket) => {
    idle({io, socket});
}

export default onConnection;