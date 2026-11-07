// ============================================================================
// Analytics controller
//
// Thin HTTP layer for /api/analytics. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates the query string with Zod.
//   3. Calls analyticsService and sends a safe JSON response.
//
// No database calls and no business rules here. Express 5 forwards rejected
// promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { AppError } from '../utils/AppError.js';
import { overviewSchema } from '../validators/analytics.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// GET /api/analytics?month=YYYY-MM&months=6
export async function getOverview(
  req: Request,
  res: Response
): Promise<void> {
  // The schema fills in months=6 when the query omits it.
  const { query } = overviewSchema.parse({ query: req.query });

  const overview = await analyticsService.overview(
    currentUserId(req),
    query
  );

  res.status(200).json({ success: true, overview });
}
