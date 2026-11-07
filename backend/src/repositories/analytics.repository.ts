// ============================================================================
// Analytics repository
//
// Read-only aggregation queries for the dashboard. Nothing here writes.
// Three separate aggregations:
//   totalsForRange      -> one number per type (income / expense)
//   expensesByCategory  -> pie facts, highest first, with name + colour
//   monthlyTotals       -> trend facts, one row per month + type
//
// Money is summed as stored. The app assumes one currency per user for now;
// mixing INR and USD totals would need exchange rates, which is out of scope.
// ============================================================================

import { Types } from 'mongoose';

import {
  Transaction,
  type TransactionType,
} from '../models/Transaction.model.js';

export interface CategoryExpenseRow {
  categoryId: string;
  name?: string;
  color?: string;
  total: number;
}

export interface MonthlyTotalsRow {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export class AnalyticsRepository {
  // Income and expense for one UTC date range.
  async totalsForRange(
    userId: string,
    from: Date,
    to: Date
  ): Promise<{ income: number; expense: number }> {
    const rows = await Transaction.aggregate<{
      _id: TransactionType;
      total: number;
    }>([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]).exec();

    let income = 0;
    let expense = 0;

    for (const row of rows) {
      if (row._id === 'income') income = row.total;
      if (row._id === 'expense') expense = row.total;
    }

    return { income, expense };
  }

  // Expense per category, biggest first, joined with the category row so the
  // frontend gets a name and colour without a second request.
  async expensesByCategory(
    userId: string,
    from: Date,
    to: Date
  ): Promise<CategoryExpenseRow[]> {
    return Transaction.aggregate<CategoryExpenseRow>([
      {
        $match: {
          user: new Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      // preserveNull... keeps money from a deleted category visible.
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: { $toString: '$_id' },
          name: '$category.name',
          color: '$category.color',
          total: 1,
        },
      },
    ]).exec();
  }

  // Income + expense per month across the trend window, all in one pass.
  async monthlyTotals(
    userId: string,
    from: Date,
    to: Date
  ): Promise<MonthlyTotalsRow[]> {
    const rows = await Transaction.aggregate<{
      _id: { month: string; type: TransactionType };
      total: number;
    }>([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            // UTC keeps the month boundary identical to monthRange().
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$date',
                timezone: 'UTC',
              },
            },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]).exec();

    // Two rows per month (income + expense) -> one row per month.
    const byMonth = new Map<string, MonthlyTotalsRow>();

    for (const row of rows) {
      const entry = byMonth.get(row._id.month) ?? {
        month: row._id.month,
        income: 0,
        expense: 0,
      };

      if (row._id.type === 'income') entry.income = row.total;
      if (row._id.type === 'expense') entry.expense = row.total;

      byMonth.set(row._id.month, entry);
    }

    return [...byMonth.values()];
  }
}
