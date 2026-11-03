import { User, IUser } from '../models/User.model.js';
import { QueryFilter, UpdateQuery } from 'mongoose';

export class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password +refreshToken').exec();
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