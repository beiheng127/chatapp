// backend/src/models/Room.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  type: 'group' | 'channel';
  avatar?: string;
  maxMembers?: number;
  creator: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  adminMembers: mongoose.Types.ObjectId[]; // 添加adminMembers
  // Mongoose自动添加的timestamps字段
  createdAt: Date;
  updatedAt: Date;
  // 虚拟字段
  memberCount?: number;
}

const roomSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  isPrivate: { type: Boolean, default: false },
  type: { type: String, enum: ['group', 'channel'], default: 'group' },
  avatar: { type: String, default: 'default-group.png' },
  maxMembers: { type: Number, default: 1000 },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  }],
  adminMembers: [{ // 添加管理员列表
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：成员数量
roomSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// 索引
roomSchema.index({ name: 'text', description: 'text' });
roomSchema.index({ isPrivate: 1, type: 1 });

export default mongoose.model<IRoom>('Room', roomSchema);