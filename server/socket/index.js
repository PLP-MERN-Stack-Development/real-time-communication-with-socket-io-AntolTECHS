// server/socket/index.js
import User from '../models/User.js';
import Message from '../models/Message.js';
import { v4 as uuidv4 } from 'uuid';

export function setupSocket(io) {
  // Map userId -> socketId for quick lookup in-memory (redundant with DB but faster)
  const userIdToSocket = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    // Authenticate with username (simple)
    socket.on('auth', async (payload, ack) => {
      try {
        const { username } = payload;
        if (!username) return ack && ack({ ok: false, error: 'No username' });

        let user = await User.findOne({ username });
        if (!user) {
          user = await User.create({ username, socketId: socket.id, online: true });
        } else {
          user.socketId = socket.id;
          user.online = true;
          await user.save();
        }

        socket.data.userId = user._id.toString();
        socket.data.username = user.username;
        userIdToSocket.set(user._id.toString(), socket.id);

        socket.join('global');
        io.emit('user:joined', { userId: user._id, username: user.username });
        // send ack and online list
        const onlineUsers = await User.find({ online: true }).select('username _id');
        ack && ack({ ok: true, userId: user._id.toString(), username: user.username, online: onlineUsers });
      } catch (err) {
        console.error('auth error', err);
        ack && ack({ ok: false, error: err.message });
      }
    });

    // join room
    socket.on('joinRoom', async ({ room }, ack) => {
      try {
        const prev = socket.rooms;
        socket.join(room);
        socket.data.currentRoom = room;
        io.to(room).emit('user:joinedRoom', { userId: socket.data.userId, username: socket.data.username, room });
        ack && ack({ ok: true });
      } catch (err) {
        ack && ack({ ok: false, error: err.message });
      }
    });

    // send message
    socket.on('message:send', async (msg, ack) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return ack && ack({ ok: false, error: 'Not authenticated' });

        const m = await Message.create({
          from: userId,
          to: msg.toUserId || null,
          room: msg.toRoom || (msg.toUserId ? `dm:${[userId, msg.toUserId].sort().join('-')}` : 'global'),
          text: msg.text
        });

        const populated = await m.populate('from', 'username').execPopulate ? await m.populate('from', 'username') : await m.populate('from', 'username');

        // broadcast
        if (msg.toUserId) {
          // private: emit to both sockets (if online)
          const targetSocketId = userIdToSocket.get(msg.toUserId);
          if (targetSocketId) io.to(targetSocketId).emit('message:new', populated);
          socket.emit('message:new', populated);
        } else {
          io.to(populated.room || 'global').emit('message:new', populated);
        }

        ack && ack({ ok: true, id: m._id, timestamp: m.createdAt });
      } catch (err) {
        console.error('message:send error', err);
        ack && ack({ ok: false, error: err.message });
      }
    });

    // typing indicator
    socket.on('typing', ({ toRoom, toUserId, typing }) => {
      if (toRoom) {
        socket.to(toRoom).emit('typing', { from: socket.data.userId, username: socket.data.username, typing });
      } else if (toUserId) {
        const ts = userIdToSocket.get(toUserId);
        if (ts) io.to(ts).emit('typing', { from: socket.data.userId, username: socket.data.username, typing });
      } else {
        socket.to('global').emit('typing', { from: socket.data.userId, username: socket.data.username, typing });
      }
    });

    // read receipt
    socket.on('read', async ({ messageId, fromUserId }) => {
      try {
        const readerId = socket.data.userId;
        if (!readerId) return;
        await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: readerId } });
        // notify the original sender
        const originSocketId = userIdToSocket.get(fromUserId);
        if (originSocketId) io.to(originSocketId).emit('message:read', { messageId, by: readerId, at: new Date() });
      } catch (err) {
        console.error('read error', err);
      }
    });

    // reaction
    socket.on('reaction:add', async ({ messageId, emoji }) => {
      try {
        const userId = socket.data.userId;
        await Message.findByIdAndUpdate(messageId, { $push: { reactions: { user: userId, emoji } } });
        const updated = await Message.findById(messageId).populate('reactions.user', 'username');
        io.emit('reaction:updated', { messageId, reactions: updated.reactions });
      } catch (err) {
        console.error('reaction error', err);
      }
    });

    // disconnect
    socket.on('disconnect', async () => {
      try {
        const userId = socket.data.userId;
        if (userId) {
          await User.findByIdAndUpdate(userId, { online: false, socketId: null });
          userIdToSocket.delete(userId);
          io.emit('user:left', { userId, username: socket.data.username });
        }
        console.log('Socket disconnected', socket.id);
      } catch (err) {
        console.error('disconnect error', err);
      }
    });
  });
}
