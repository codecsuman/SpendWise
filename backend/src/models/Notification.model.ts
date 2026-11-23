import mongoose, { Schema, type Types } from "mongoose";

const notificationTypes = ["budget_alert", "goal_reminder"] as const;

export type NotificationType = (typeof notificationTypes)[number];

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  message: string;
  readAt: Date | null;
  dedupeKey?: string;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: notificationTypes,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    readAt: {
      type: Date,
      default: null,
    },
    dedupeKey: {
      type: String,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: "string" } },
  },
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
