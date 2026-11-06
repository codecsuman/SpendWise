import { QueryFilter, Types, UpdateQuery } from 'mongoose';

import { Transaction, ITransaction } from '../models/Transaction.model.js';
import type { ListTransactionsQuery } from '../validators/transaction.validator.js';

type SortOption = ListTransactionsQuery['sort'];

// The API exposes friendly names; the database needs real sort objects.
// A second key (createdAt / date) keeps equal values in a stable order.
const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  newest: { date: -1, createdAt: -1 },
  oldest: { date: 1, createdAt: 1 },
  highest: { amount: -1, date: -1 },
  lowest: { amount: 1, date: -1 },
};

export interface TransactionListResult {
  items: ITransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// A user's search text must never be treated as a regex.
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter(
  userId: string,
  query: ListTransactionsQuery
): QueryFilter<ITransaction> {
  const filter: QueryFilter<ITransaction> = { user: userId };

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = new Types.ObjectId(query.category);

  if (query.from || query.to) {
    const range: { $gte?: Date; $lte?: Date } = {};

    if (query.from) range.$gte = query.from;

    if (query.to) {
      // "to" means the end of that day. This uses UTC — once user timezones
      // matter for analytics, compute the boundary in the service instead.
      const endOfDay = new Date(query.to);
      endOfDay.setUTCHours(23, 59, 59, 999);
      range.$lte = endOfDay;
    }

    filter.date = range;
  }

  if (query.search) {
    filter.description = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  return filter;
}

export class TransactionRepository {
  async create(
    userId: string,
    data: Partial<ITransaction>
  ): Promise<ITransaction> {
    return Transaction.create({ ...data, user: userId });
  }

  // Ownership lives in the filter, not in a check after the read.
  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<ITransaction | null> {
    return Transaction.findOne({ _id: id, user: userId }).exec();
  }

  async findManyForUser(
    userId: string,
    query: ListTransactionsQuery
  ): Promise<TransactionListResult> {
    const filter = buildFilter(userId, query);
    const skip = (query.page - 1) * query.limit;

    // Count and page run together; neither depends on the other.
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .sort(SORT_MAP[query.sort])
        .skip(skip)
        .limit(query.limit)
        .exec(),
      Transaction.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Total expense per category in a date range. Used by the budget service
  // to calculate spent / remaining without storing a second copy of the truth.
  async sumExpensesByCategory(
    userId: string,
    from: Date,
    to: Date
  ): Promise<Map<string, number>> {
    const rows = await Transaction.aggregate<{
      _id: Types.ObjectId;
      total: number;
    }>([
      {
        $match: {
          user: new Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]).exec();

    return new Map(rows.map((row) => [String(row._id), row.total]));
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateQuery<ITransaction>
  ): Promise<ITransaction | null> {
    return Transaction.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      user: userId,
    }).exec();
    return !!deleted;
  }
}
