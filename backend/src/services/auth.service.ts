import { randomBytes } from 'node:crypto';
import { mongo } from 'mongoose';
import { UserRepository } from '../repositories/user.repository.js';
import { categoryService } from './category.service.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateTokenPair, verifyToken } from '../utils/jwt.js';
import { hashToken } from '../utils/tokenHash.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import {
  emailEnabled,
  sendEmailCode,
  sendPasswordResetNotice,
  verifyEmailCode,
} from './authEmail.service.js';
import type { IUser } from '../models/User.model.js';
import type { GoogleProfile } from './google.service.js';
import type { RegisterInput, LoginInput, ResetPasswordInput } from '../validators/auth.validator.js';

const userRepository = new UserRepository();
const googleLinkRequired = 'Sign in with your existing SpendWise password, then link Google from Profile.';

export interface PublicUser {
  id: string;
  name: string;
  avatarUrl?: string;
  email: string;
  currency: string;
  timezone: string;
  language: string;
  emailVerified: boolean;
  googleLinked: boolean;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Strip sensitive fields before sending a user back over HTTP.
 * Never return `password`, `refreshToken` or verification tokens.
 */
export function toPublicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email,
    currency: user.currency,
    timezone: user.timezone,
    language: user.language,
    emailVerified: user.emailVerified,
    googleLinked: Boolean(user.googleId),
    createdAt: user.createdAt,
  };
}

export class AuthService {
  async requestSignupCode(email: string): Promise<void> {
    if (!await userRepository.emailExists(email)) await sendEmailCode('signup', email);
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    if (emailEnabled) {
      if (!input.code) throw new AppError('Request and enter your email code to sign up.', 400);
      await verifyEmailCode('signup', input.email, input.code);
    }

    const alreadyExists = await userRepository.emailExists(input.email);
    if (alreadyExists) {
      throw new AppError('An account with this email already exists', 409);
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      currency: input.currency,
      timezone: input.timezone,
      language: input.language,
      emailVerified: emailEnabled,
    });

    // Every new account starts with the 11 default categories.
    // Seeding is idempotent and must not fail registration: the user row
    // already exists, so a retry would only hit "email already exists".
    try {
      await categoryService.seedDefaults(user._id.toString());
    } catch (error) {
      logger.error({ err: error }, 'Failed to seed default categories');
    }

    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);

    // Same message for "no user" and "wrong password" — avoids leaking
    // which emails are registered.
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatches = await verifyPassword(input.password, user.password);
    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401);
    }

    return this.issueSession(user, new Date());
  }

  async loginWithGoogle(profile: GoogleProfile): Promise<AuthResult> {
    const user = await userRepository.findByGoogleId(profile.googleId)
      ?? await this.registerGoogleUser(profile);

    return this.issueSession(user, new Date());
  }

  private async issueSession(user: IUser, lastLoginAt?: Date, oldTokenHash?: string): Promise<AuthResult> {
    const id = user._id.toString();
    const version = user.sessionVersion ?? 0;
    const tokens = generateTokenPair(id, user.email, version);
    const saved = await userRepository.saveSession(id, version, hashToken(tokens.refreshToken), lastLoginAt, oldTokenHash);
    if (!saved) throw new AppError('Session has expired. Please sign in again.', 401);
    return { user: toPublicUser(user), ...tokens };
  }

  private async registerGoogleUser(profile: GoogleProfile): Promise<IUser> {
    if (!profile.emailVerified) {
      throw new AppError('Verify your email with Google before signing up.', 401);
    }

    if (await userRepository.emailExists(profile.email)) {
      // Another request may have just completed this same Google signup.
      const existingUser = await userRepository.findByGoogleId(profile.googleId);
      if (existingUser) return existingUser;
      throw new AppError(googleLinkRequired, 409);
    }

    let user: IUser;
    try {
      user = await userRepository.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl,
        emailVerified: true,
        // The schema requires a hash. Nobody is given a password for this account.
        password: await hashPassword(randomBytes(32).toString('hex')),
      });
    } catch (error) {
      if (!(error instanceof mongo.MongoServerError) || error.code !== 11000) throw error;
      const existingUser = await userRepository.findByGoogleId(profile.googleId);
      if (existingUser) return existingUser;
      throw new AppError(googleLinkRequired, 409);
    }

    try {
      await categoryService.seedDefaults(user._id.toString());
    } catch (error) {
      logger.error({ err: error }, 'Failed to seed default categories');
    }
    return user;
  }

  async linkGoogle(userId: string, profile: GoogleProfile): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!profile.emailVerified || profile.email !== user.email) {
      throw new AppError('Choose a Google account with the same verified email as your SpendWise account.', 403);
    }

    try {
      const linkedUser = await userRepository.linkGoogleId(userId, profile.email, profile.googleId);
      if (linkedUser) return toPublicUser(linkedUser);
    } catch (error) {
      if (!(error instanceof mongo.MongoServerError) || error.code !== 11000) throw error;
    }
    throw new AppError('A different Google connection already exists for one of these accounts.', 409);
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.getCurrentUser(userId);
    if (!user.emailVerified) await sendEmailCode('verify-email', user.email, user.id);
  }

  async verifyExistingEmail(userId: string, code: string): Promise<PublicUser> {
    const user = await this.getCurrentUser(userId);
    if (user.emailVerified) return user;
    await verifyEmailCode('verify-email', user.email, code, user.id);
    const updatedUser = await userRepository.updateById(user.id, { emailVerified: true });
    if (!updatedUser) throw new AppError('User not found', 404);
    return toPublicUser(updatedUser);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (user) await sendEmailCode('reset-password', user.email, `${user._id}:${user.sessionVersion ?? 0}`);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw new AppError('This code is invalid or expired. Request a new code and try again.', 401);
    const id = user._id.toString();
    const version = user.sessionVersion ?? 0;
    await verifyEmailCode('reset-password', user.email, input.code, `${id}:${version}`);
    const password = await hashPassword(input.password);
    if (!await userRepository.updatePasswordAndRevokeSessions(id, version, password, true)) {
      throw new AppError('The password changed during this request. Request a new code to try again.', 409);
    }
    void sendPasswordResetNotice(user.email).catch(() => {});
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let version: number;
    try {
      version = verifyToken(refreshToken, 'refresh').sessionVersion ?? 0;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokenHash = hashToken(refreshToken);
    const user = await userRepository.findByRefreshToken(tokenHash);
    if (!user || (user.sessionVersion ?? 0) !== version) {
      throw new AppError('Refresh token has been revoked', 401);
    }
    return this.issueSession(user, undefined, tokenHash);
  }

  async logout(userId: string): Promise<void> {
    await userRepository.clearRefreshToken(userId);
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toPublicUser(user);
  }
}

export const authService = new AuthService();
