// ============================================================================
// Recurring transaction controller
//
// Thin HTTP layer for /api/recurring. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates body / params / query with Zod.
//   3. Calls recurringService and sends a safe JSON response.
//
// No database calls and no business rules here.
// Express 5 forwards rejected promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';
import { recurringService } from '../services/recurring.service.js';
import { AppError } from '../utils/AppError.js';
import {
  createRecurringSchema,
  deleteRecurringSchema,
  getRecurringSchema,
  listRecurringSchema,
  updateRecurringSchema,
} from '../validators/recurring.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// POST /api/recurring
export async function createRecurring(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = createRecurringSchema.parse({ body: req.body });

  const recurring = await recurringService.create(currentUserId(req), body);

  res.status(201).json({ success: true, recurring });
}

// GET /api/recurring
export async function listRecurring(
  req: Request,
  res: Response
): Promise<void> {
  // The schema fills in the default sort and converts "true"/"false".
  const { query } = listRecurringSchema.parse({ query: req.query });

  const recurring = await recurringService.list(currentUserId(req), query);

  res.status(200).json({ success: true, recurring });
}

// GET /api/recurring/:id
export async function getRecurring(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = getRecurringSchema.parse({ params: req.params });

  const recurring = await recurringService.getById(
    currentUserId(req),
    params.id
  );

  res.status(200).json({ success: true, recurring });
}

// PATCH /api/recurring/:id
// Also handles pause/resume: PATCH { "isActive": false }.
export async function updateRecurring(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = updateRecurringSchema.parse({
    params: req.params,
    body: req.body,
  });

  const recurring = await recurringService.update(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, recurring });
}

// DELETE /api/recurring/:id
export async function deleteRecurring(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = deleteRecurringSchema.parse({ params: req.params });

  await recurringService.remove(currentUserId(req), params.id);

  res
    .status(200)
    .json({ success: true, message: 'Recurring transaction deleted' });
}
