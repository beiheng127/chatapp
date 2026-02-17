import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationCode extends Document {
  email: string;
  code: string;
  type: 'register' | 'reset_password' | 'change_password';
  createdAt: Date;
  expiresAt: Date;
}

const verificationCodeSchema = new Schema<IVerificationCode>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['register', 'reset_password', 'change_password'],
    default: 'change_password'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // TTL index: automatically delete after 10 minutes (600 seconds)
  },
  expiresAt: {
    type: Date,
    required: true
  }
});

// Create compound index for faster lookups
verificationCodeSchema.index({ email: 1, type: 1 });

export default mongoose.model<IVerificationCode>('VerificationCode', verificationCodeSchema);
