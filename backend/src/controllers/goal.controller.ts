// ============================================================================
// Goal controller
//
// Thin HTTP layer for /api/goals. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates body / params / query with Zod.
//   3. Calls goalService and sends a safe JSON response.
//
// No database calls and no business rules here.
// Express 5 forwards rejected promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';
import { goalService } from '../services/goal.service.js';
import { AppError } from '../utils/AppError.js';
import {
  contributeGoalSchema,
  createGoalSchema,
  deleteGoalSchema,
  getGoalSchema,
  listGoalsSchema,
  updateGoalSchema,
} from '../validators/goal.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// POST /api/goals
export async function createGoal(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = createGoalSchema.parse({ body: req.body });

  const goal = await goalService.create(currentUserId(req), body);

  res.status(201).json({ success: true, goal });
}

// GET /api/goals
export async function listGoals(
  req: Request,
  res: Response
): Promise<void> {
  // The schema fills in the default sort.
  const { query } = listGoalsSchema.parse({ query: req.query });

  const goals = await goalService.list(currentUserId(req), query);

  res.status(200).json({ success: true, goals });
}

// GET /api/goals/:id
export async function getGoal(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = getGoalSchema.parse({ params: req.params });

  const goal = await goalService.getById(currentUserId(req), params.id);

  res.status(200).json({ success: true, goal });
}

// PATCH /api/goals/:id
export async function updateGoal(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = updateGoalSchema.parse({
    params: req.params,
    body: req.body,
  });

  const goal = await goalService.update(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, goal });
}

// POST /api/goals/:id/contribute
// Its own endpoint because adding money is not the same as editing the goal.
export async function contributeToGoal(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = contributeGoalSchema.parse({
    params: req.params,
    body: req.body,
  });

  const goal = await goalService.contribute(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, goal });
}

// DELETE /api/goals/:id
export async function deleteGoal(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = deleteGoalSchema.parse({ params: req.params });

  await goalService.remove(currentUserId(req), params.id);

  res.status(200).json({ success: true, message: 'Goal deleted' });
}
