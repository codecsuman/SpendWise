import mongoose from "mongoose";

import { Notification } from "../models/Notification.model.js";
import { AppError } from "../utils/AppError.js";

export class NotificationService {
  async createBudgetAlert(
    userId: string,
    budgetId: string,
    threshold: 90 | 100,
    categoryName: string,
  ): Promise<void> {
    const dedupeKey = `budget:${budgetId}:${threshold}`;

    await Notification.updateOne(
      { user: userId, dedupeKey },
      {
        $setOnInsert: {
          type: "budget_alert",
          message: `You’ve reached ${threshold}% of your ${categoryName} budget.`,
          readAt: null,
        },
      },
      { upsert: true, runValidators: true },
    ).exec();
  }

  async createGoalReminder(
    userId: string,
    goalId: string,
    goalName: string,
    targetDate: Date,
  ): Promise<void> {
    const deadline = targetDate.toISOString().slice(0, 10);
    const dedupeKey = `goal:${goalId}:${deadline}`;

    await Notification.updateOne(
      { user: userId, dedupeKey },
      {
        $setOnInsert: {
          type: "goal_reminder",
          message: `Your savings goal "${goalName}" is due on ${deadline}.`,
          readAt: null,
        },
      },
      { upsert: true, runValidators: true },
    ).exec();
  }

  async list(userId: string) {
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  async markAsRead(userId: string, notificationId: string) {
    if (!mongoose.isObjectIdOrHexString(notificationId)) {
      throw new AppError("Invalid notification id", 400);
    }

    const filter = { _id: notificationId, user: userId };
    const updated = await Notification.findOneAndUpdate(
      { ...filter, readAt: null },
      { $set: { readAt: new Date() } },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    if (updated) {
      return updated;
    }

    const existing = await Notification.findOne(filter).lean().exec();
    if (!existing) {
      throw new AppError("Notification not found", 404);
    }

    return existing;
  }
}
