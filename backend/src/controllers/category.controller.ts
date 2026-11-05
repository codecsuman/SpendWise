// ============================================================================
// Category controller
//
// Thin HTTP layer for /api/categories. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates body / params / query with Zod.
//   3. Calls categoryService and sends a safe JSON response.
//
// No database calls and no business rules here.
// Express 5 forwards rejected promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';
import { categoryService } from '../services/category.service.js';
import { AppError } from '../utils/AppError.js';
import {
  createCategorySchema,
  deleteCategorySchema,
  getCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from '../validators/category.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  return req.user.id;
}

// POST /api/categories
export async function createCategory(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = createCategorySchema.parse({ body: req.body });

  const category = await categoryService.create(currentUserId(req), body);

  res.status(201).json({ success: true, category });
}

// GET /api/categories
export async function listCategories(
  req: Request,
  res: Response
): Promise<void> {
  // The schema fills in the default sort, so `query.sort` is always defined.
  const { query } = listCategoriesSchema.parse({ query: req.query });

  const categories = await categoryService.list(currentUserId(req), query);

  res.status(200).json({ success: true, categories });
}

// GET /api/categories/:id
export async function getCategory(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = getCategorySchema.parse({ params: req.params });

  const category = await categoryService.getById(
    currentUserId(req),
    params.id
  );

  res.status(200).json({ success: true, category });
}

// PATCH /api/categories/:id
export async function updateCategory(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = updateCategorySchema.parse({
    params: req.params,
    body: req.body,
  });

  const category = await categoryService.update(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, category });
}

// DELETE /api/categories/:id
export async function deleteCategory(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = deleteCategorySchema.parse({ params: req.params });

  await categoryService.remove(currentUserId(req), params.id);

  res.status(200).json({ success: true, message: 'Category deleted' });
}
