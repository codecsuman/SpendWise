import type { Request, Response } from "express";
import { z } from "zod";

import { NotificationService } from "../services/notification.service.js";
import { AppError } from "../utils/AppError.js";

const notificationService = new NotificationService();
const emptyInputSchema = z.strictObject({});
const readNotificationParams = z.strictObject({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid notification id"),
});

function currentUserId(req: Request): string {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  return req.user.id;
}

export async function listNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  emptyInputSchema.parse(req.query);
  emptyInputSchema.parse(req.body ?? {});
  const notifications = await notificationService.list(currentUserId(req));

  res.status(200).json({ success: true, notifications });
}

export async function markNotificationAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = currentUserId(req);
  const { id } = readNotificationParams.parse(req.params);
  emptyInputSchema.parse(req.query);
  emptyInputSchema.parse(req.body ?? {});
  const notification = await notificationService.markAsRead(userId, id);

  res.status(200).json({ success: true, notification });
}
