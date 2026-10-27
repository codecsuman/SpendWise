import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  userId: string;
  email: string;
  type: TokenType;
}

function getSecret(type: TokenType): string {
  return type === 'access' ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
}

function getExpiry(type: TokenType): string {
  return type === 'access' ? env.JWT_ACCESS_EXPIRY : env.JWT_REFRESH_EXPIRY;
}

export function signToken(
  payload: Omit<JwtPayload, 'type'>,
  type: TokenType
): string {
  return jwt.sign({ ...payload, type }, getSecret(type), {
    expiresIn: getExpiry(type) as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string, type: TokenType): JwtPayload {
  const decoded = jwt.verify(token, getSecret(type));

  if (typeof decoded === 'string' || decoded.type !== type) {
    throw new jwt.JsonWebTokenError(`Invalid ${type} token`);
  }

  return decoded as JwtPayload;
}

export function generateTokenPair(
  userId: string,
  email: string
): { accessToken: string; refreshToken: string } {
  const accessToken = signToken({ userId, email }, 'access');
  const refreshToken = signToken({ userId, email }, 'refresh');
  return { accessToken, refreshToken };
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token);
    return typeof decoded === 'string' ? null : (decoded as JwtPayload);
  } catch {
    return null;
  }
}
