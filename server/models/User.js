// server/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  socketId: { type: String, default: null },
  online: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
