// ============================================================================
// Auth routes
//
// A route file only maps an HTTP method + path to a controller function.
// No business logic lives here.
//
// Public routes:    register, login, refresh  (the user has no session yet)
// Protected routes: logout, me               (authMiddleware runs first and
//                                             puts { id, email } on req.user)
// ============================================================================

import { Router } from 'express';
import {
  getMe,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const authRouter = Router();

// --- Public routes ---
// authLimiter runs before the controller, so a blocked IP never reaches bcrypt.
authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', refresh);

// --- Protected routes ---
// Express runs middleware left to right, so authMiddleware verifies the access
// token before the controller is reached. If it fails, the controller never runs.
authRouter.post('/logout', authMiddleware, logout);
authRouter.get('/me', authMiddleware, getMe);

export default authRouter;
