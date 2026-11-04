import mongoose, { Document, Schema, Types } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export interface ITransaction extends Document {
  user: Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: string;
  category: Types.ObjectId;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
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
      required: true,
      min: [0.01, 'Amount must be greater than 0'],
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Every read is scoped to one user and sorted by date.
transactionSchema.index({ user: 1, date: -1 });
// "How much did this user spend in this category this month?"
transactionSchema.index({ user: 1, category: 1, date: -1 });
// "Show me income vs expense over time."
transactionSchema.index({ user: 1, type: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>(
  'Transaction',
  transactionSchema
);
