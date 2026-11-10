// ============================================================================
// Workspace controller
//
// Thin HTTP layer for /api/workspace/notes. It only:
//   1. Reads the logged-in user id from req.user (set by authMiddleware).
//   2. Validates body / params / query with Zod.
//   3. Calls workspaceService and sends a safe JSON response.
//
// No database calls and no business rules here.
// Express 5 forwards rejected promises to the error middleware.
// ============================================================================

import type { Request, Response } from 'express';

import { workspaceService } from '../services/workspace.service.js';
import { AppError } from '../utils/AppError.js';
import {
  createNoteSchema,
  deleteNoteSchema,
  getNoteSchema,
  listNotesSchema,
  updateNoteSchema,
} from '../validators/workspace.validator.js';

// Every route in this file sits behind authMiddleware, so req.user should
// always exist. This guard keeps TypeScript honest and returns 401 instead of
// crashing if a route is ever mounted without the middleware.
function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  return req.user.id;
}

// POST /api/workspace/notes
export async function createNote(
  req: Request,
  res: Response
): Promise<void> {
  const { body } = createNoteSchema.parse({ body: req.body });

  const note = await workspaceService.create(currentUserId(req), body);

  res.status(201).json({ success: true, note });
}

// GET /api/workspace/notes
export async function listNotes(
  req: Request,
  res: Response
): Promise<void> {
  const { query } = listNotesSchema.parse({ query: req.query });

  const result = await workspaceService.list(currentUserId(req), query);

  res.status(200).json({
    success: true,
    notes: result.notes,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
}

// GET /api/workspace/notes/:id
export async function getNote(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = getNoteSchema.parse({ params: req.params });

  const note = await workspaceService.getById(currentUserId(req), params.id);

  res.status(200).json({ success: true, note });
}

// PATCH /api/workspace/notes/:id
export async function updateNote(
  req: Request,
  res: Response
): Promise<void> {
  const { params, body } = updateNoteSchema.parse({
    params: req.params,
    body: req.body,
  });

  const note = await workspaceService.update(
    currentUserId(req),
    params.id,
    body
  );

  res.status(200).json({ success: true, note });
}

// DELETE /api/workspace/notes/:id
export async function deleteNote(
  req: Request,
  res: Response
): Promise<void> {
  const { params } = deleteNoteSchema.parse({ params: req.params });

  await workspaceService.remove(currentUserId(req), params.id);

  res.status(200).json({ success: true, message: 'Note deleted' });
}
