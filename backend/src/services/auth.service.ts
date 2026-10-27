import { UserRepository } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateTokenPair, verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import type { IUser } from '../models/User.model.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validator.js';

const userRepository = new UserRepository();

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  language: string;
  emailVerified: boolean;
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
function toPublicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    currency: user.currency,
    timezone: user.timezone,
    language: user.language,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
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
    });

    const { accessToken, refreshToken } = generateTokenPair(
      user._id.toString(),
      user.email
    );

    // Store the refresh token so it can be revoked on logout
    await userRepository.updateById(user._id.toString(), { refreshToken });

    return { user: toPublicUser(user), accessToken, refreshToken };
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

    const { accessToken, refreshToken } = generateTokenPair(
      user._id.toString(),
      user.email
    );

    await userRepository.updateById(user._id.toString(), {
      refreshToken,
      lastLoginAt: new Date(),
    });

    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      verifyToken(refreshToken, 'refresh');
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await userRepository.findByRefreshToken(refreshToken);

    // Token is valid but not stored → it was revoked (logout / rotation)
    if (!user) {
      throw new AppError('Refresh token has been revoked', 401);
    }

    const tokens = generateTokenPair(user._id.toString(), user.email);

    // Token rotation: replace the old refresh token with a new one
    await userRepository.updateById(user._id.toString(), {
      refreshToken: tokens.refreshToken,
    });

    return { user: toPublicUser(user), ...tokens };
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
