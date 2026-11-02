// ============================================================================
// Rate limiting
//
// A "limiter" counts requests per IP address inside a time window and answers
// 429 Too Many Requests once the budget is spent.
//
// Two limiters:
//   globalLimiter -> normal browsing (100 requests / 15 min)
//   authLimiter   -> login + register (5 requests / 15 min), because those are
//                    the endpoints a password-guessing script would attack.
//
// The counter lives in memory, so restarting the server resets it.
// ============================================================================

import { rateLimit } from "express-rate-limit";

// Shared response body shape, same as our error middleware.
const tooMany = (message: string) => ({ status: 429, message });

// 100 requests / 15 min per IP for the whole API.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8", // adds the RateLimit-* headers
  legacyHeaders: false, // hides the old X-RateLimit-* headers
  message: tooMany("Too many requests. Please try again later."),
});

// 5 requests / 15 min per IP for login and register.
// skipSuccessfulRequests: a correct password does not burn the budget, so a
// real user is never locked out; only failed attempts count towards the limit.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: tooMany("Too many attempts. Please try again in 15 minutes."),
});
