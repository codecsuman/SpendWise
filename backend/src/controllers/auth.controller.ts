// ============================================================================
// Auth controller
//
// The controller is the HTTP layer. It does four jobs:
//   1. Validate the request body with Zod.
//   2. Call the auth service (all business logic lives there).
//   3. Put the access + refresh tokens into httpOnly cookies.
//   4. Send a safe JSON response that never contains a token or a password.
//
// Express 5 automatically forwards rejected promises to the error middleware,
// so these handlers do not need try/catch or next(error).
// ============================================================================

import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { authService } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from '../validators/auth.validator.js';

// Tell TypeScript that every Express request may carry a logged-in user.
// The auth middleware fills this in after it verifies the access token.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// Cookie names. The auth middleware must read these exact names.
const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

// Cookie lifetimes in milliseconds.
// Keep these in sync with JWT_ACCESS_EXPIRY and JWT_REFRESH_EXPIRY in .env.
const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Shared cookie settings:
// - httpOnly: JavaScript cannot read the cookie (blocks XSS token theft)
// - secure: the browser only sends it over HTTPS in production
// - sameSite: not sent on cross-site requests (helps block CSRF)
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

// Write both auth cookies onto the response.
function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });
}

// Remove both cookies. Used by logout.
function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, cookieOptions);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
}

// Express does not parse cookies by itself, so we read the "Cookie" header.
// Example header: "accessToken=abc; refreshToken=def"
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  const prefix = `${name}=`;
  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return undefined;

  const value = match.slice(prefix.length);

  try {
    return decodeURIComponent(value);
  } catch {
    // If the value is not valid URL encoding, return it unchanged.
    return value;
  }
}

// POST /api/auth/register
export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  // Zod checks the body and throws a ZodError when it is invalid.
  const { body } = registerSchema.parse({ body: req.body });

  const { user, accessToken, refreshToken } = await authService.register(body);

  // Send the tokens as cookies, not in the JSON body.
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({ success: true, user });
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { body } = loginSchema.parse({ body: req.body });

  const { user, accessToken, refreshToken } = await authService.login(body);

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({ success: true, user });
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  // The refresh token travels in its own httpOnly cookie.
  const refreshToken = readCookie(req, REFRESH_COOKIE);

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  const { cookies } = refreshSchema.parse({ cookies: { refreshToken } });
  const result = await authService.refresh(cookies.refreshToken);

  // Rotation: replace the old cookie pair with the new one.
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({ success: true, user: result.user });
}

// POST /api/auth/logout  (protected by the auth middleware)
export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Revoke the refresh token in the database, then clear the browser cookies.
  await authService.logout(req.user.id);
  clearAuthCookies(res);

  res.status(200).json({ success: true, message: 'Logged out' });
}

// GET /api/auth/me  (protected by the auth middleware)
export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({ success: true, user });
}
