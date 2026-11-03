import mongoose from 'mongoose';

import { UserRepository } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser, type PublicUser } from './auth.service.js';
import type { IUser } from '../models/User.model.js';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
} from '../validators/user.validator.js';

const userRepository = new UserRepository();

export class UserService {
  /**
   * One place to load a user and fail loudly.
   * The jwt payload is trusted, but a valid ObjectId check keeps
   * User.findById() from throwing a CastError (which would become a 500).
   */
  private async loadUser(userId: string, withPassword = false): Promise<IUser> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid user id', 400);
    }

    const user = withPassword
      ? await userRepository.findByIdWithPassword(userId)
      : await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.loadUser(userId);
    return toPublicUser(user);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUser> {
    // Build the update by hand: only the four fields the validator allows,
    // and only the ones the client actually sent. Nothing else can slip in.
    const changes: Record<string, string> = {};

    if (input.name !== undefined) changes.name = input.name;
    if (input.currency !== undefined) changes.currency = input.currency;
    if (input.timezone !== undefined) changes.timezone = input.timezone;
    if (input.language !== undefined) changes.language = input.language;

    const user = await userRepository.updateById(userId, changes);

    // updateById returns null when the id does not exist.
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toPublicUser(user);
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    // 'password' has select: false in the model, so it must be asked for.
    const user = await this.loadUser(userId, true);

    const currentMatches = await verifyPassword(
      input.currentPassword,
      user.password
    );

    // 401, not 400: the caller failed to prove who they are.
    if (!currentMatches) {
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedPassword = await hashPassword(input.newPassword);

    await userRepository.updateById(userId, {
      // $set + $unset must be atomic operators — a mixed document is rejected
      // by MongoDB. Clearing the refresh hash logs out every other device.
      $set: { password: hashedPassword },
      $unset: { refreshToken: 1 },
    });
  }
}

export const userService = new UserService();
