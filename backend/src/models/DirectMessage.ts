// backend/src/models/DirectMessage.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file';
  read: boolean;
  readAt?: Date;
}

const directMessageSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
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
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// 创建复合索引以提高查询效率
directMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
directMessageSchema.index({ receiver: 1, read: 1 });

export default mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);