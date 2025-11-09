// server/controllers/chatController.js
import Message from "../models/Message.js";

// GET /api/chat/messages
export const getMessages = async (req, res) => {
  try {
    const room = req.query.room || "global";
    const before = req.query.before ? new Date(req.query.before) : new Date();
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const userId = req.user._id; // assuming req.user is set by auth middleware

    // Fetch messages: room messages OR private messages involving the user
    const messages = await Message.find({
      $or: [
        { room }, // room messages
        { to: userId }, // private messages sent to me
        { from: userId, to: { $exists: true } } // private messages I sent
      ],
      createdAt: { $lt: before },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("from", "username")
      .populate("to", "username");

    // Normalize output for frontend
    const formatted = messages
      .map((m) => ({
        id: m._id,
        message: m.text,
        sender: m.from?.username || "Unknown",
        senderId: m.from?._id?.toString() || null,
        room: m.room || null,
        to: m.to?.username || null,
        toId: m.to?._id?.toString() || null,
        createdAt: m.createdAt,
        status: m.status || "sent", // delivered/read status
        type: m.type || "text", // text or file
      }))
      .reverse(); // oldest → newest

    res.json(formatted);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ error: err.message });
  }
};
