// ============================================================================
// Auth middleware
//
// This runs BEFORE any protected route. It does four things:
//   1. Finds the access token (cookie first, then Authorization header).
//   2. Verifies the token signature and checks it is an ACCESS token.
//   3. Attaches { id, email } to req.user.
//   4. Calls next() so the real route handler can run.
//
// If anything fails, next(error) sends the request to error.middleware.ts.
// ============================================================================

import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

const ACCESS_COOKIE = 'accessToken';

// Add `user` to Express's Request type.
// The controller has the same block; identical declarations merge safely.
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

// Express does not parse cookies by itself, so read the raw Cookie header.
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

// Prefer the httpOnly cookie. Fall back to "Authorization: Bearer <token>"
// so tools like curl and Postman can call protected routes too.
function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }

  return readCookie(req, ACCESS_COOKIE);
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    // verifyToken checks the signature, expiry and token type ('access').
    const payload = verifyToken(token, 'access');

    // These values come from the signed JWT. The client cannot fake them.
    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    // Invalid and expired tokens are handled by error.middleware.ts.
    next(error);
  }
}
