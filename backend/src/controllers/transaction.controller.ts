// ============================================================================
// Transaction controller
//
// Thin HTTP layer for /api/transactions. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates body / params / query with Zod.
//   3. Calls transactionService and sends a safe JSON response.
//
// No database calls and no business rules here.
// Express 5 forwards rejected promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';
import { transactionService } from '../services/transaction.service.js';
import { AppError } from '../utils/AppError.js';
import {
  createTransactionSchema,
  deleteTransactionSchema,
  getTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from '../validators/transaction.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// POST /api/transactions
export async function createTransaction(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = createTransactionSchema.parse({ body: req.body });

  const transaction = await transactionService.create(
    currentUserId(req),
    body
  );

  res.status(201).json({ success: true, transaction });
}

// GET /api/transactions
export async function listTransactions(
  req: Request,
  res: Response
): Promise<void> {
  // req.query arrives as strings, so the schema coerces page/limit to numbers.
  const { query } = listTransactionsSchema.parse({ query: req.query });

  const result = await transactionService.list(currentUserId(req), query);

  res.status(200).json({
    success: true,
    transactions: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
}

// GET /api/transactions/:id
export async function getTransaction(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = getTransactionSchema.parse({ params: req.params });

  const transaction = await transactionService.getById(
    currentUserId(req),
    params.id
  );

  res.status(200).json({ success: true, transaction });
}

// PATCH /api/transactions/:id
export async function updateTransaction(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = updateTransactionSchema.parse({
    params: req.params,
    body: req.body,
  });

  const transaction = await transactionService.update(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, transaction });
}

// DELETE /api/transactions/:id
export async function deleteTransaction(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = deleteTransactionSchema.parse({ params: req.params });

  await transactionService.remove(currentUserId(req), params.id);

  res.status(200).json({ success: true, message: 'Transaction deleted' });
}
