import { QueryFilter, UpdateQuery } from 'mongoose';

import { Category, ICategory } from '../models/Category.model.js';
import type { ListCategoriesQuery } from '../validators/category.validator.js';

type SortOption = ListCategoriesQuery['sort'];

// The API exposes friendly names; the database needs real sort objects.
// "newest" gets a second key so equal timestamps stay in a stable order.
const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  name: { name: 1 },
  newest: { createdAt: -1, name: 1 },
};

// A user's search text must never be treated as a regex.
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter(
  userId: string,
  query: ListCategoriesQuery
): QueryFilter<ICategory> {
  const filter: QueryFilter<ICategory> = { user: userId };

  if (query.type) filter.type = query.type;

  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  }

  return filter;
}

export class CategoryRepository {
  async create(
    userId: string,
    data: Partial<ICategory>
  ): Promise<ICategory> {
    return Category.create({ ...data, user: userId });
  }

  // Ownership lives in the filter, not in a check after the read.
  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<ICategory | null> {
    return Category.findOne({ _id: id, user: userId }).exec();
  }

  // The list is small, so there is no pagination — only filtering and sorting.
  async findManyForUser(
    userId: string,
    query: ListCategoriesQuery
  ): Promise<ICategory[]> {
    return Category.find(buildFilter(userId, query))
      .sort(SORT_MAP[query.sort])
      .exec();
  }

  // Case-insensitive duplicate check. The collation must match the one on the
  // unique index, otherwise "Food" and "food" are treated as different names
  // here but the index rejects the write anyway.
  async nameExists(
    userId: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    const filter: QueryFilter<ICategory> = { user: userId, name };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const found = await Category.findOne(filter)
      .collation({ locale: 'en', strength: 2 })
      .select('_id')
      .exec();

    return !!found;
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateQuery<ICategory>
  ): Promise<ICategory | null> {
    return Category.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await Category.findOneAndDelete({
      _id: id,
      user: userId,
    }).exec();

    return !!deleted;
  }
}
