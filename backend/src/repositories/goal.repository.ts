// ============================================================================
// Goal repository
//
// The database layer for Phase 8. Every query starts with `user: userId`, so a
// goal id taken from the URL can never reach another account.
//
// Sorting:
//   target   -> soonest target date first
//   newest   -> newest goal first
//   progress -> biggest saved/target ratio first
//
// `find()` casts strings to ObjectId for you; `aggregate()` does NOT, so the
// progress branch converts the id with `new Types.ObjectId(userId)` by hand.
// ============================================================================

import { QueryFilter, Types, UpdateQuery } from 'mongoose';

import { Goal, IGoal } from '../models/Goal.model.js';
import type { ListGoalsQuery } from '../validators/goal.validator.js';

type SortOption = ListGoalsQuery['sort'];

// The API sends friendly names; the database needs real sort objects.
// `progress` is missing on purpose: it is calculated, not stored.
const SORT_MAP: Record<
  Exclude<SortOption, 'progress'>,
  Record<string, 1 | -1>
> = {
  target: { targetDate: 1, createdAt: -1 },
  newest: { createdAt: -1 },
};

function buildFilter(
  userId: string,
  query: ListGoalsQuery
): QueryFilter<IGoal> {
  const filter: QueryFilter<IGoal> = { user: userId };

  if (query.status) filter.status = query.status;

  return filter;
}

export class GoalRepository {
  async create(userId: string, data: Partial<IGoal>): Promise<IGoal> {
    // `user` comes from the token, never from the request body.
    return Goal.create({ ...data, user: userId });
  }

  // Ownership lives in the filter, not in a check after the read.
  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<IGoal | null> {
    return Goal.findOne({ _id: id, user: userId }).exec();
  }

  // Goals per user are few (5-15), so there is no pagination.
  async findManyForUser(
    userId: string,
    query: ListGoalsQuery
  ): Promise<IGoal[]> {
    const { sort } = query;

    if (sort === 'progress') {
      return Goal.aggregate<IGoal>([
        {
          $match: {
            user: new Types.ObjectId(userId),
            ...(query.status ? { status: query.status } : {}),
          },
        },
        {
          // saved / target, guarded against a zero target.
          $addFields: {
            progress: {
              $cond: [
                { $gt: ['$targetAmount', 0] },
                { $divide: ['$savedAmount', '$targetAmount'] },
                0,
              ],
            },
          },
        },
        { $sort: { progress: -1, targetDate: 1 } },
        // Drop the helper field so the response matches the model.
        { $unset: 'progress' },
      ]).exec();
    }

    return Goal.find(buildFilter(userId, query)).sort(SORT_MAP[sort]).exec();
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateQuery<IGoal>
  ): Promise<IGoal | null> {
    return Goal.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await Goal.findOneAndDelete({
      _id: id,
      user: userId,
    }).exec();

    return !!deleted;
  }
}
