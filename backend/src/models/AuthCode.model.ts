import mongoose, { Schema } from 'mongoose';

const authCodeSchema = new Schema({
  _id: { type: String, required: true },
  digest: String,
  expiresAt: { type: Date, required: true, expires: 0 },
  resendAt: { type: Date, required: true },
  attemptsLeft: { type: Number, required: true },
});

export const AuthCode = mongoose.model('AuthCode', authCodeSchema);
