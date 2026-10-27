import { Request, Response, NextFunction } from "express";

export function notFoundMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const error = new Error(
    `Route ${req.method} ${req.originalUrl} not found`,
  ) as Error & { statusCode?: number };
  error.statusCode = 404;
  next(error);
}
