// ============================================================================
// Workspace routes
//
// A route file only maps an HTTP method + path to a controller function.
// Every route here is protected: authMiddleware runs first and puts
// { id, email } on req.user before the controller is reached.
// ============================================================================

import { Router } from 'express';

import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
} from '../controllers/workspace.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const workspaceRouter = Router();

// One line instead of repeating the middleware on all five routes.
workspaceRouter.use(authMiddleware);

workspaceRouter.post('/notes', createNote);
workspaceRouter.get('/notes', listNotes);
workspaceRouter.get('/notes/:id', getNote);
workspaceRouter.patch('/notes/:id', updateNote);
workspaceRouter.delete('/notes/:id', deleteNote);

export default workspaceRouter;
