import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(helmet());

// Allowlist: only the frontend origin may call this API.
// `credentials: true` is what lets the browser send/accept httpOnly cookies.
// A wildcard origin ("*") is illegal together with credentials, so we never use it.
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

app.use(express.json({ limit: "10kb" }));

// Simple request logging middleware (replace with pino-http later)
app.use((req, _res, next) => {
  const start = Date.now();
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Auth endpoints: /api/auth/register, /login, /refresh, /logout, /me
// Mounted here, above the 404 handler, so Express can still match these paths.
app.use("/api/auth", authRouter);

// 404 handler (must be after all routes)
app.use(notFoundMiddleware);

// Global error handler (must be last)
app.use(errorMiddleware);

export default app;
