import { mongo } from 'mongoose';
import { AuthCode } from '../models/AuthCode.model.js';

export const authCodeRepository = {
  async reserve(key: string, digest: string, now: Date, expiresAt: Date, resendAt: Date): Promise<boolean> {
    try {
      await AuthCode.updateOne(
        { _id: key, resendAt: { $lte: now } },
        { $set: { digest, expiresAt, resendAt, attemptsLeft: 5 } },
        { upsert: true },
      );
      return true;
    } catch (error) {
      // An existing row with a future resendAt fails the unique _id index.
      if (error instanceof mongo.MongoServerError && error.code === 11000) return false;
      throw error;
    }
  },

  async consume(key: string, digest: string): Promise<boolean> {
    const active = { _id: key, expiresAt: { $gt: new Date() }, attemptsLeft: { $gt: 0 } };
    const used = await AuthCode.updateOne(
      { ...active, digest },
      { $unset: { digest: 1 } },
    );
    if (used.modifiedCount) return true;

    await AuthCode.updateOne(
      { ...active, digest: { $exists: true, $ne: digest } },
      { $inc: { attemptsLeft: -1 } },
    );
    return false;
  },

  async discard(key: string, digest: string): Promise<void> {
    await AuthCode.updateOne({ _id: key, digest }, { $unset: { digest: 1 } });
  },
};
