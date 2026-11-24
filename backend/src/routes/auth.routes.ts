// ============================================================================
// Auth routes
//
// A route file only maps an HTTP method + path to a controller function.
// No business logic lives here.
//
// Public routes:    register, login, refresh, Google sign-in
//                   (the user has no session yet)
// Protected routes: logout, me, Google link  (authMiddleware runs first and
//                                             puts { id, email } on req.user)
// ============================================================================

import { Router } from 'express';
import {
  authOptions,
  forgotPassword,
  getMe,
  googleLogin,
  googleLink,
  login,
  logout,
  refresh,
  register,
  requestEmailVerification,
  requestSignupCode,
  resetPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authLimiter, otpCheckLimiter, otpSendLimiter } from '../middleware/rateLimit.middleware.js';

const authRouter = Router();

// --- Public routes ---
// authLimiter runs before the controller, so a blocked IP never reaches bcrypt.
authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/google', authLimiter, googleLogin);
authRouter.get('/options', authOptions);
authRouter.post('/register/code', otpSendLimiter, requestSignupCode);
authRouter.post('/forgot-password', otpSendLimiter, forgotPassword);
authRouter.post('/reset-password', otpCheckLimiter, resetPassword);

// --- Protected routes ---
// Express runs middleware left to right, so authMiddleware verifies the access
// token before the controller is reached. If it fails, the controller never runs.
authRouter.post('/logout', authMiddleware, logout);
authRouter.get('/me', authMiddleware, getMe);
authRouter.post('/google/link', authMiddleware, authLimiter, googleLink);
authRouter.post('/email/code', authMiddleware, otpSendLimiter, requestEmailVerification);
authRouter.post('/email/verify', authMiddleware, otpCheckLimiter, verifyEmail);

export default authRouter;
