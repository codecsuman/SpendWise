// ============================================================================
// Budget controller
//
// Thin HTTP layer for /api/budgets. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates body / params / query with Zod.
//   3. Calls budgetService and sends a safe JSON response.
//
// No database calls and no business rules here.
// Express 5 forwards rejected promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';
import { budgetService } from '../services/budget.service.js';
import { AppError } from '../utils/AppError.js';
import {
  createBudgetSchema,
  deleteBudgetSchema,
  getBudgetSchema,
  listBudgetsSchema,
  updateBudgetSchema,
} from '../validators/budget.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// POST /api/budgets
export async function createBudget(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = createBudgetSchema.parse({ body: req.body });

  const budget = await budgetService.create(currentUserId(req), body);

  res.status(201).json({ success: true, budget });
}

// GET /api/budgets
export async function listBudgets(
  req: Request,
  res: Response
): Promise<void> {
  // The schema fills in the default sort; the service fills in the month.
  const { query } = listBudgetsSchema.parse({ query: req.query });

  const budgets = await budgetService.list(currentUserId(req), query);

  res.status(200).json({ success: true, budgets });
}

// GET /api/budgets/:id
export async function getBudget(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = getBudgetSchema.parse({ params: req.params });

  const budget = await budgetService.getById(
    currentUserId(req),
    params.id
  );

  res.status(200).json({ success: true, budget });
}

// PATCH /api/budgets/:id
export async function updateBudget(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = updateBudgetSchema.parse({
    params: req.params,
    body: req.body,
  });

  const budget = await budgetService.update(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, budget });
}

// DELETE /api/budgets/:id
export async function deleteBudget(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = deleteBudgetSchema.parse({ params: req.params });

  await budgetService.remove(currentUserId(req), params.id);

  res.status(200).json({ success: true, message: 'Budget deleted' });
}
