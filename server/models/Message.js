// server/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // private
  room: { type: String, default: 'global' },
  text: { type: String, required: true },
  attachments: [{ url: String, type: String }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String
  }]
}, { timestamps: true });

messageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
