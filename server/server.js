import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// ------------------------
// In-memory storage
// ------------------------
const users = {};       // { socketId: { username, id, room } }
const messages = [];    // { id, sender, senderId, message, room, isPrivate, to, timestamp, reactions: [] }
const typingUsers = {}; // { room: { socketId: username } }

// ------------------------
// Socket.io events
// ------------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // --- Authenticate user ---
  socket.on("auth", ({ username }, callback) => {
    if (!username?.trim()) return callback({ ok: false, message: "Username required" });
    users[socket.id] = { username: username.trim(), id: socket.id, room: null };
    io.emit("user_list", Object.values(users));
    callback({ ok: true, userId: socket.id, username });
  });

  // --- Join Room ---
  socket.on("joinRoom", ({ room }, callback) => {
    if (!room || !users[socket.id]) return;
    socket.join(room);
    users[socket.id].room = room;
    if (!typingUsers[room]) typingUsers[room] = {};
    io.to(room).emit("user_list", Object.values(users).filter(u => u.room === room));
    io.to(room).emit("user_joined", { user: users[socket.id] });
    callback?.();
  });

  // --- Leave Room ---
  socket.on("leaveRoom", ({ room }) => {
    if (!users[socket.id]) return;
    socket.leave(room);
    io.to(room).emit("user_left", { user: users[socket.id] });
    users[socket.id].room = null;
  });

  // --- Room message ---
  socket.on("send_message", ({ message, toRoom }, callback) => {
    if (!users[socket.id]) return;
    const msg = {
      id: Date.now(),
      sender: users[socket.id].username,
      senderId: socket.id,
      message,
      room: toRoom || null,
      isPrivate: false,
      timestamp: new Date().toISOString(),
      reactions: [],
    };
    messages.push(msg);
    if (toRoom) io.to(toRoom).emit("receive_message", msg);
    else io.emit("receive_message", msg);

    // Sound / notification
    io.to(toRoom || "global").emit("new_message_notification", msg);
    callback?.({ ok: true });
  });

  // --- Private message ---
  socket.on("private_message", ({ to, message }, callback) => {
    if (!users[socket.id] || !users[to]) return;
    const msg = {
      id: Date.now(),
      sender: users[socket.id].username,
      senderId: socket.id,
      message,
      isPrivate: true,
      to,
      timestamp: new Date().toISOString(),
      reactions: [],
    };
    socket.to(to).emit("private_message", msg);
    socket.emit("private_message", msg);
    io.to(to).emit("new_message_notification", msg); // notification
    callback?.({ ok: true });
  });

  // --- Add reaction ---
  socket.on("add_reaction", ({ messageId, emoji }) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const existing = msg.reactions.find(r => r.userId === socket.id);
    if (existing) existing.emoji = emoji;
    else msg.reactions.push({ userId: socket.id, emoji });

    if (msg.room) io.to(msg.room).emit("reaction_updated", msg);
    else if (msg.to) {
      io.to(msg.to).emit("reaction_updated", msg);
      socket.emit("reaction_updated", msg);
    }
  });

  // --- Typing indicator ---
  socket.on("typing", (isTyping) => {
    const room = users[socket.id]?.room;
    if (!room) return;
    if (!typingUsers[room]) typingUsers[room] = {};

    if (isTyping) typingUsers[room][socket.id] = users[socket.id].username;
    else delete typingUsers[room][socket.id];

    io.to(room).emit("typing_users", Object.values(typingUsers[room]));
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    const room = users[socket.id]?.room;
    if (users[socket.id]) delete users[socket.id];
    if (room && typingUsers[room]) delete typingUsers[room][socket.id];
    io.emit("user_list", Object.values(users));
    if (room) io.to(room).emit("user_left", { userId: socket.id });
  });
});

// ------------------------
// REST API
// ------------------------
app.get("/", (req, res) => res.send("Socket.io Chat Server running"));

// Pagination for messages
app.get("/api/messages", (req, res) => {
  const { room, before, limit } = req.query;
  const ts = before ? new Date(before).getTime() : Date.now();
  const lim = Math.min(parseInt(limit || "20", 10), 50);
  let filtered = messages.filter(m => !room || m.room === room);
  filtered = filtered.filter(m => new Date(m.timestamp).getTime() < ts);
  filtered = filtered.slice(-lim);
  res.json(filtered);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
