import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
  currency: string;
  timezone: string;
  language: string;
  refreshToken?: string;
  sessionVersion?: number;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: String,
    // Google's stable user id ("sub"). Sparse: password accounts simply do
    // not have this field, and two accounts can never share one.
    googleId: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      default: 'INR',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'es', 'fr', 'de'],
      default: 'en',
    },
    refreshToken: {
      type: String,
      select: false,
    },
    sessionVersion: { type: Number, default: 0 },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ refreshToken: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
