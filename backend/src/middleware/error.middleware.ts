import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("❌ Error:", err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.issues
      .map((e) => `${e.path.map(String).join(".")}: ${e.message}`)
      .join("; ");
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: messages,
    });
    return;
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values((err as any).errors)
      .map((e: any) => e.message)
      .join("; ");
    res.status(400).json({
      success: false,
      message: "Database validation failed",
      errors: messages,
    });
    return;
  }

  // Mongoose duplicate key error (unique constraint)
  if (err.name === "MongoServerError" && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
    return;
  }
  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Token expired",
    });
    return;
  }

  // Expected application errors (thrown by services)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Default: unknown server error
  const statusCode = 500;
  const message =
    env.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
