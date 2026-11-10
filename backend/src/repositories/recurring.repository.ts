// ============================================================================
// Recurring transaction repository
//
// The database layer for Phase 9. Every user-facing query starts with
// `user: userId`, so an id taken from the URL can never reach another account.
//
// The single exception is findDue(): the scheduler runs for the whole system,
// so it is not scoped to a user. It is internal only — never called from a
// controller; the routes only ever use the *ForUser methods.
//
// `find()` casts strings to ObjectId for you, so no manual cast is needed here.
// ============================================================================

import { QueryFilter, UpdateQuery } from 'mongoose';

import {
  IRecurringTransaction,
  RecurringTransaction,
} from '../models/RecurringTransaction.model.js';
import type { ListRecurringQuery } from '../validators/recurring.validator.js';

type SortOption = ListRecurringQuery['sort'];

// The API sends friendly names; the database needs real sort objects.
// The keys must match the `sort` enum in recurring.validator.ts.
const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  // What the page shows first: the rule that will fire soonest.
  nextRun: { nextRunAt: 1, createdAt: -1 },
  newest: { createdAt: -1 },
};

function buildFilter(
  userId: string,
  query: ListRecurringQuery
): QueryFilter<IRecurringTransaction> {
  const filter: QueryFilter<IRecurringTransaction> = { user: userId };

  // Only add the key when the caller asked for it — "undefined" in a filter
  // means "match nothing", not "match everything".
  if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
  if (query.frequency) filter.frequency = query.frequency;

  return filter;
}

export class RecurringTransactionRepository {
  async create(
    userId: string,
    data: Partial<IRecurringTransaction>
  ): Promise<IRecurringTransaction> {
    // `user` comes from the token, never from the request body.
    return RecurringTransaction.create({ ...data, user: userId });
  }

  // Ownership lives in the filter, not in a check after the read.
  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<IRecurringTransaction | null> {
    return RecurringTransaction.findOne({ _id: id, user: userId }).exec();
  }

  // Rules per user are few (a handful), so there is no pagination.
  async findManyForUser(
    userId: string,
    query: ListRecurringQuery
  ): Promise<IRecurringTransaction[]> {
    return RecurringTransaction.find(buildFilter(userId, query))
      .sort(SORT_MAP[query.sort])
      .exec();
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateQuery<IRecurringTransaction>
  ): Promise<IRecurringTransaction | null> {
    return RecurringTransaction.findOneAndUpdate(
      { _id: id, user: userId },
      data,
      { new: true, runValidators: true }
    ).exec();
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await RecurringTransaction.findOneAndDelete({
      _id: id,
      user: userId,
    }).exec();

    return !!deleted;
  }

  // --- worker-only ---------------------------------------------------------

  // "Which active rules are due?" The (isActive, nextRunAt) index answers this.
  // The limit keeps one slow run from loading the whole collection into memory.
  async findDue(
    now: Date,
    limit = 100
  ): Promise<IRecurringTransaction[]> {
    return RecurringTransaction.find({
      isActive: true,
      nextRunAt: { $lte: now },
    })
      .sort({ nextRunAt: 1 })
      .limit(limit)
      .exec();
  }

  // After a rule fires: move nextRunAt forward and record the run.
  // Not user-scoped because the worker already holds the document it just used.
  async advanceSchedule(
    id: string,
    lastRunAt: Date,
    nextRunAt: Date
  ): Promise<IRecurringTransaction | null> {
    return RecurringTransaction.findByIdAndUpdate(
      id,
      { lastRunAt, nextRunAt },
      { new: true }
    ).exec();
  }
}
