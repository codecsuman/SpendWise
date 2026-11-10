// ============================================================================
// Recurring transaction service
//
// Business layer for /api/recurring.
// Order of layers: controller -> service -> repository -> model.
//
// Rules enforced here:
//   - a bad id is a 400 before any query runs
//   - a missing rule (or another user's rule) is a 404
//   - the category must belong to the same user as the rule
//   - nextRunAt is computed on the server, never sent by the client
//   - endDate must come after startDate, even when only endDate is patched
// Ownership itself lives in every repository filter.
// ============================================================================

import mongoose, { Types } from 'mongoose';

import { Category } from '../models/Category.model.js';
import { RecurringTransactionRepository } from '../repositories/recurring.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  IRecurringTransaction,
  RecurrenceFrequency,
} from '../models/RecurringTransaction.model.js';
import type {
  CreateRecurringInput,
  ListRecurringQuery,
  UpdateRecurringInput,
} from '../validators/recurring.validator.js';

const recurringRepository = new RecurringTransactionRepository();

// Add whole months without the "31 Jan + 1 month = 3 March" overflow.
// Step 1: park the date on day 1 so moving the month cannot spill over.
// Step 2: move the month.  Step 3: put the day back, capped at the real
// last day of that month. 29 Feb + 12 months lands on 28 Feb, not 1 March.
function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  // Day 0 of the next month = last day of this month.
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDay));

  return result;
}

// The single place that knows how a schedule moves forward.
// The worker (Phase 13) imports this too, so the rule never drifts.
export function nextRunDate(
  from: Date,
  frequency: RecurrenceFrequency,
  interval: number
): Date {
  switch (frequency) {
    case 'daily':
      return new Date(from.getTime() + interval * 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(from.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return addMonths(from, interval);
    case 'yearly':
      return addMonths(from, interval * 12);
  }
}

export class RecurringTransactionService {
  // The route validator already checks :id. This is the second layer:
  // never let an invalid id reach Mongoose.
  private assertValidId(id: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid recurring transaction id', 400);
    }
  }

  // A category id from the body is untrusted input just like a URL id.
  // Without this check a user could schedule a bill against someone else's
  // category and read its name back later.
  private async assertCategoryOwned(
    userId: string,
    categoryId: string
  ): Promise<void> {
    const category = await Category.findOne({
      _id: categoryId,
      user: userId,
    }).exec();

    if (!category) {
      throw new AppError('Category not found', 404);
    }
  }

  async create(
    userId: string,
    input: CreateRecurringInput
  ): Promise<IRecurringTransaction> {
    await this.assertCategoryOwned(userId, input.category);

    return recurringRepository.create(userId, {
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'INR',
      category: new Types.ObjectId(input.category),
      description: input.description,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      startDate: input.startDate,
      // The first run is the start date itself. Setting it here means the
      // worker only has to compare one field against the clock.
      nextRunAt: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive ?? true,
    });
  }

  async list(
    userId: string,
    query: ListRecurringQuery
  ): Promise<IRecurringTransaction[]> {
    // Filtering and sorting happen in the repository.
    return recurringRepository.findManyForUser(userId, query);
  }

  async getById(userId: string, id: string): Promise<IRecurringTransaction> {
    this.assertValidId(id);

    const rule = await recurringRepository.findByIdForUser(id, userId);

    if (!rule) {
      throw new AppError('Recurring transaction not found', 404);
    }

    return rule;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateRecurringInput
  ): Promise<IRecurringTransaction> {
    this.assertValidId(id);

    const existing = await recurringRepository.findByIdForUser(id, userId);

    if (!existing) {
      throw new AppError('Recurring transaction not found', 404);
    }

    if (input.category !== undefined) {
      await this.assertCategoryOwned(userId, input.category);
    }

    // The validator can only compare two dates if both were sent. When the
    // patch carries just endDate, compare it with the stored startDate.
    if (input.endDate) {
      const startDate = input.startDate ?? existing.startDate;

      if (input.endDate <= startDate) {
        throw new AppError('End date must be after the start date', 400);
      }
    }

    // Build the update by hand so only validator-approved fields reach
    // MongoDB. `undefined` means "not sent" and must be skipped.
    // `description: null` / `endDate: null` are real values that clear fields.
    const changes: Record<string, unknown> = {};

    if (input.type !== undefined) changes.type = input.type;
    if (input.amount !== undefined) changes.amount = input.amount;
    if (input.currency !== undefined) changes.currency = input.currency;
    if (input.category !== undefined) {
      changes.category = new Types.ObjectId(input.category);
    }
    if (input.description !== undefined) changes.description = input.description;
    if (input.frequency !== undefined) changes.frequency = input.frequency;
    if (input.interval !== undefined) changes.interval = input.interval;
    if (input.startDate !== undefined) changes.startDate = input.startDate;
    if (input.endDate !== undefined) changes.endDate = input.endDate;
    if (input.isActive !== undefined) changes.isActive = input.isActive;

    // Before the first run, nextRunAt still mirrors startDate, so it is safe
    // to recompute. After a run it must not be touched by hand, or a bill is
    // skipped or charged twice.
    if (input.startDate !== undefined && !existing.lastRunAt) {
      changes.nextRunAt = input.startDate;
    }

    const updated = await recurringRepository.updateForUser(id, userId, changes);

    // Mongoose returns null when the id is missing OR owned by someone else.
    // Both cases look the same from the outside: 404.
    if (!updated) {
      throw new AppError('Recurring transaction not found', 404);
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.assertValidId(id);

    const deleted = await recurringRepository.deleteForUser(id, userId);

    if (!deleted) {
      throw new AppError('Recurring transaction not found', 404);
    }
  }
}

export const recurringService = new RecurringTransactionService();
