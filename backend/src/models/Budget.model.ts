import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBudget extends Document {
  user: Types.ObjectId;
  category: Types.ObjectId;
  amount: number;
  currency: string;
  // The month this budget covers, stored as "YYYY-MM", e.g. "2026-11".
  month: string;
  createdAt: Date;
  updatedAt: Date;
}

// Only real months are allowed: 2026-01 ... 2026-12.
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const budgetSchema = new Schema<IBudget>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Budget amount must be greater than 0'],
      // Keep money at 2 decimals, same as Transaction.amount.
      set: (value: number) => Math.round(value * 100) / 100,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      default: 'INR',
    },
    month: {
      type: String,
      required: true,
      match: [MONTH_PATTERN, 'Month must look like YYYY-MM'],
    },
  },
  { timestamps: true }
);

// "Show this user's budgets for this month."
budgetSchema.index({ user: 1, month: 1 });

// One budget per category per month per user.
// This is the rule that stops duplicate budgets.
budgetSchema.index(
  { user: 1, category: 1, month: 1 },
  { unique: true }
);

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);
