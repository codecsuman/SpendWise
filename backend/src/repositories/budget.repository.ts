import { QueryFilter, Types, UpdateQuery } from 'mongoose';

import { Budget, IBudget } from '../models/Budget.model.js';
import type { ListBudgetsQuery } from '../validators/budget.validator.js';

type SortOption = ListBudgetsQuery['sort'];

// The API exposes friendly names; the database needs real sort objects.
// A second key keeps equal values in a stable order.
const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  newest: { month: -1, createdAt: -1 },
  highest: { amount: -1, createdAt: -1 },
};

function buildFilter(
  userId: string,
  query: ListBudgetsQuery
): QueryFilter<IBudget> {
  const filter: QueryFilter<IBudget> = { user: userId };

  if (query.month) filter.month = query.month;
  if (query.category) filter.category = new Types.ObjectId(query.category);

  return filter;
}

export class BudgetRepository {
  async create(
    userId: string,
    data: Partial<IBudget>
  ): Promise<IBudget> {
    return Budget.create({ ...data, user: userId });
  }

  // Ownership lives in the filter, not in a check after the read.
  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<IBudget | null> {
    return Budget.findOne({ _id: id, user: userId }).exec();
  }

  // One budget per category, so this list is small: no pagination.
  async findManyForUser(
    userId: string,
    query: ListBudgetsQuery
  ): Promise<IBudget[]> {
    return Budget.find(buildFilter(userId, query))
      .sort(SORT_MAP[query.sort])
      .exec();
  }

  // Mirrors the unique index { user, category, month }.
  // excludeId is used on PATCH so a budget does not clash with itself.
  async existsForCategoryMonth(
    userId: string,
    category: string,
    month: string,
    excludeId?: string
  ): Promise<boolean> {
    const filter: QueryFilter<IBudget> = {
      user: userId,
      category: new Types.ObjectId(category),
      month,
    };

    if (excludeId) filter._id = { $ne: excludeId };

    const found = await Budget.findOne(filter).select('_id').exec();

    return !!found;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateQuery<IBudget>
  ): Promise<IBudget | null> {
    return Budget.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await Budget.findOneAndDelete({
      _id: id,
      user: userId,
    }).exec();

    return !!deleted;
  }
}
