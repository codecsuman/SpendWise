import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function notFoundMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
}
