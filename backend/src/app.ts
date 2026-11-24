import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { globalLimiter } from "./middleware/rateLimit.middleware.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from './routes/user.routes.js'
import transactionRouter from './routes/transaction.routes.js'
import csvRouter from './routes/csv.routes.js'
import categoryRouter from './routes/category.routes.js'
import budgetRouter from './routes/budget.routes.js'
import analyticsRouter from './routes/analytics.routes.js'
import goalRouter from './routes/goal.routes.js'
import notificationRouter from './routes/notification.routes.js';
import workspaceRouter from './routes/workspace.routes.js'
import recurringRouter from './routes/recurring.routes.js'
const app = express();

// Behind a proxy or load balancer, trust one hop so rate limiting and
// secure-cookie detection see the real client address.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
      frameSrc: ["'self'", "https://accounts.google.com/gsi/"],
      connectSrc: ["'self'", "https://accounts.google.com/gsi/"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.googleusercontent.com"],
    },
  },
}));

const frontendDir = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));
const frontendIndex = join(frontendDir, "index.html");
if (env.NODE_ENV === "production" && existsSync(frontendIndex)) {
  // Static files and browser navigation do not consume the API rate limit.
  const frontendRoute = /^\/(?!api(?:\/|$)|health(?:\/|$))/i;
  const serveStatic = express.static(frontendDir, { index: false, redirect: false });
  app.get(frontendRoute, serveStatic, (req, res, next) => {
    res.vary("Accept");
    const assetRequest = req.path.includes(".") || /^\/(?:assets|media)(?:\/|$)/i.test(req.path);
    if (assetRequest || !req.accepts("html")) return next();
    res.sendFile(frontendIndex);
  });
}

// Allowlist: only the frontend origin may call this API.
// `credentials: true` is what lets the browser send/accept httpOnly cookies.
// A wildcard origin ("*") is illegal together with credentials, so we never use it.
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

app.use(express.json({ limit: "10kb" }));

// Count every request per IP. Must sit before the routes it protects.
app.use(globalLimiter);

// Structured request logs. Cookies and authorization headers are redacted
// in config/logger.ts, so tokens never reach the log output.
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Auth endpoints: /api/auth/register, /login, /refresh, /logout, /me
// Mounted here, above the 404 handler, so Express can still match these paths.
app.use("/api/auth", authRouter);

app.use('/api/users',userRouter);

app.use('/api/transactions', transactionRouter);

// Prefix both CSV routes with /api/csv.
app.use('/api/csv', csvRouter);

app.use('/api/categories', categoryRouter);

app.use('/api/budgets', budgetRouter);

app.use('/api/analytics', analyticsRouter);

app.use('/api/goals', goalRouter);
app.use('/api/notifications', notificationRouter);

app.use('/api/workspace', workspaceRouter);

app.use('/api/recurring', recurringRouter);

// 404 handler (must be after all routes)
app.use(notFoundMiddleware);

// Global error handler (must be last)
app.use(errorMiddleware);




export default app;
