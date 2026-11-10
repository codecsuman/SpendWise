import mongoose, { Document, Schema, Types } from 'mongoose';

// A goal moves through these three states only.
export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface IGoal extends Document {
  user: Types.ObjectId;
  // What the goal is for: "Buy Laptop", "Emergency fund", "Trip to Goa".
  name: string;
  // How much money the goal needs in total.
  targetAmount: number;
  // How much has been put aside so far. Starts at 0.
  savedAmount: number;
  currency: string;
  // The day the user wants to reach the goal.
  targetDate: Date;
  note?: string;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      minlength: [2, 'Goal name must be at least 2 characters'],
      maxlength: [80, 'Goal name must be at most 80 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
      // Keep money at 2 decimals, same as Transaction.amount and Budget.amount.
      set: (value: number) => Math.round(value * 100) / 100,
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Saved amount cannot be negative'],
      set: (value: number) => Math.round(value * 100) / 100,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      default: 'INR',
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note must be at most 300 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// "Show this user's goals, soonest target date first."
goalSchema.index({ user: 1, status: 1, targetDate: 1 });

export const Goal = mongoose.model<IGoal>('Goal', goalSchema);
