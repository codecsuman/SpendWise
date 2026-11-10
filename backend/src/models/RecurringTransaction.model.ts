import mongoose, { Document, Schema, Types } from 'mongoose';

// How often the rule fires. "interval" multiplies this: every 2 weeks, etc.
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Same two values as Transaction.type. Keep the two lists identical.
export type RecurringType = 'income' | 'expense';

export interface IRecurringTransaction extends Document {
  user: Types.ObjectId;
  type: RecurringType;
  amount: number;
  currency: string;
  category: Types.ObjectId;
  description?: string;
  frequency: RecurrenceFrequency;
  // Every N frequencies. 1 = every month, 3 = every 3 months.
  interval: number;
  // The first due date. The worker uses this to start the schedule.
  startDate: Date;
  // The next date the worker should create a real transaction.
  // It is the only field the scheduler has to look at.
  nextRunAt: Date;
  // Optional stop date. Nothing is created after this day.
  endDate?: Date;
  // When the worker last created a transaction from this rule.
  lastRunAt?: Date;
  // Paused rules keep their schedule but create nothing.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const recurringTransactionSchema = new Schema<IRecurringTransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      // Keep money at 2 decimals, same as Transaction.amount.
      set: (value: number) => Math.round(value * 100) / 100,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      default: 'INR',
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    interval: {
      type: Number,
      default: 1,
      min: [1, 'Interval must be at least 1'],
      max: [12, 'Interval cannot be more than 12'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    nextRunAt: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    lastRunAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// The worker's question: "which rules are due right now?"
recurringTransactionSchema.index({ isActive: 1, nextRunAt: 1 });
// The page's question: "show this user's rules, newest first."
recurringTransactionSchema.index({ user: 1, isActive: 1, createdAt: -1 });

export const RecurringTransaction = mongoose.model<IRecurringTransaction>(
  'RecurringTransaction',
  recurringTransactionSchema
);
