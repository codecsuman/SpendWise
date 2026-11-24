import { User, IUser } from '../models/User.model.js';
import { QueryFilter, UpdateQuery } from 'mongoose';

function sessionFilter(id: string, version: number): QueryFilter<IUser> {
  return { _id: id, sessionVersion: version === 0 ? { $in: [null, 0] } : version };
}

export class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    await User.init();
    const user = new User(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password +refreshToken').exec();
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return User.findOne({ googleId }).exec();
  }

  async linkGoogleId(id: string, email: string, googleId: string): Promise<IUser | null> {
    await User.init();
    return User.findOneAndUpdate(
      { _id: id, email, googleId: { $in: [null, googleId] } },
      { $set: { googleId, emailVerified: true } },
      { returnDocument: 'after', runValidators: true },
    ).exec();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).exec();
  }

  // 'password' is select: false in the model, so it has to be asked for
  // explicitly. Used only by password comparison, never for responses.
  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select('+password').exec();
  }

  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).exec();
  }

  // The argument is the HASH of the refresh token, never the token itself.
  async findByRefreshToken(tokenHash: string): Promise<IUser | null> {
    return User.findOne({ refreshToken: tokenHash }).select('+refreshToken').exec();
  }

  async isSessionCurrent(id: string, version: number): Promise<boolean> {
    return Boolean(await User.exists(sessionFilter(id, version)));
  }

  async saveSession(
    id: string,
    version: number,
    tokenHash: string,
    lastLoginAt?: Date,
    oldTokenHash?: string,
  ): Promise<boolean> {
    const result = await User.updateOne(
      { ...sessionFilter(id, version), ...(oldTokenHash ? { refreshToken: oldTokenHash } : {}) },
      { $set: { refreshToken: tokenHash, ...(lastLoginAt ? { lastLoginAt } : {}) } },
    );
    return result.matchedCount === 1;
  }

  async updatePasswordAndRevokeSessions(id: string, version: number, password: string, emailConfirmed = false): Promise<boolean> {
    const result = await User.updateOne(
      sessionFilter(id, version),
      {
        $set: { password, ...(emailConfirmed ? { emailVerified: true } : {}) },
        $inc: { sessionVersion: 1 },
        $unset: { refreshToken: 1 },
      },
    );
    return result.matchedCount === 1;
  }

  async updateById(
    id: string,
    data: UpdateQuery<IUser>
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async updateLastLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { lastLoginAt: new Date() }).exec();
  }

  async clearRefreshToken(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { $unset: { refreshToken: 1 } }).exec();
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const query: QueryFilter<IUser> = { email };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const user = await User.findOne(query).select('_id').exec();
    return !!user;
  }

  /**
   * Delete user by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id).exec();
    return !!result;
  }
}
