import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const socket = io(SERVER, { autoConnect: false });

export function connect(username, cb) {
  socket.connect();
  socket.emit("auth", { username }, (res) => cb?.(res));
}

export function joinRoom(room, cb) {
  socket.emit("joinRoom", { room }, cb);
}

export function leaveRoom(room, cb) {
  socket.emit("leaveRoom", { room }, cb);
}

export default socket;
