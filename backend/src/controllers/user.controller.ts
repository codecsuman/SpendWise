// ============================================================================
// User controller
//
// Thin HTTP layer for /api/users. It only does three things:
//   1. Read the logged-in user id from req.user (filled by authMiddleware).
//   2. Validate the body with Zod.
//   3. Call userService and send a safe JSON response.
//
// No business logic and no database calls live here.
// Express 5 forwards rejected promises to the error middleware,
// so there is no try/catch and no next(error).
// ============================================================================

import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { AppError } from '../utils/AppError.js';
import {
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/user.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// GET /api/users/me
export async function getProfile(
  req: Request,
  res: Response
): Promise<void> {
  const user = await userService.getProfile(currentUserId(req));

  res.status(200).json({ success: true, user });
}

// PATCH /api/users/me
export async function updateProfile(
  req: Request,
  res: Response
): Promise<void> {
  // Only name/currency/timezone/language pass. Unknown keys such as `role`
  // are a 400, not a silent ignore.
  const { body } = updateProfileSchema.parse({ body: req.body });

  const user = await userService.updateProfile(currentUserId(req), body);

  res.status(200).json({ success: true, user });
}

// PATCH /api/users/me/password
export async function changePassword(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = changePasswordSchema.parse({ body: req.body });

  await userService.changePassword(currentUserId(req), body);

  // The service revoked the refresh token, so the user must log in again.
  // The frontend should clear its auth state and redirect to /login.
  res.status(200).json({
    success: true,
    message: 'Password updated. Please log in again.',
  });
}
