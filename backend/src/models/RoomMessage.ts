// backend/src/models/RoomMessage.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomMessage extends Document {
  room: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  readBy: mongoose.Types.ObjectId[];
  replyTo?: mongoose.Types.ObjectId; // 回复某条消息
}

const roomMessageSchema = new Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'RoomMessage'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
roomMessageSchema.index({ room: 1, createdAt: -1 });
roomMessageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.model<IRoomMessage>('RoomMessage', roomMessageSchema);