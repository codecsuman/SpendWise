import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Simple request logging middleware (replace with pino-http later)
app.use((req, _res, next) => {
  const start = Date.now();
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404 handler (must be after all routes)
app.use(notFoundMiddleware);

// Global error handler (must be last)
app.use(errorMiddleware);

export default app;
