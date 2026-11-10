// ============================================================================
// Goal service
//
// Business layer for /api/goals.
// Order of layers: controller -> service -> repository -> model.
//
// Rules enforced here:
//   - a bad id is a 400 before any query runs
//   - a missing goal (or another user's goal) is a 404
//   - savedAmount is rounded to 2 decimals, like every other money field
//   - an active goal becomes "completed" when savings reach the target
//   - cancelled goals cannot receive money
//   - a manual status is never overwritten by the auto rule
// Ownership itself lives in every repository filter.
// ============================================================================

import mongoose from 'mongoose';

import { GoalRepository } from '../repositories/goal.repository.js';
import { AppError } from '../utils/AppError.js';
import type { GoalStatus, IGoal } from '../models/Goal.model.js';
import type {
  ContributeGoalInput,
  CreateGoalInput,
  ListGoalsQuery,
  UpdateGoalInput,
} from '../validators/goal.validator.js';

const goalRepository = new GoalRepository();

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// Auto-complete only from "active". A cancelled goal stays cancelled, and
// lowering savedAmount later does not silently reopen a completed goal.
function statusAfterSaving(
  current: GoalStatus,
  savedAmount: number,
  targetAmount: number
): GoalStatus {
  if (current === 'active' && savedAmount >= targetAmount) {
    return 'completed';
  }

  return current;
}

export class GoalService {
  // The route validator already checks :id. This is the second layer:
  // never let an invalid id reach Mongoose.
  private assertValidId(id: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid goal id', 400);
    }
  }

  async create(
    userId: string,
    input: CreateGoalInput
  ): Promise<IGoal> {
    const savedAmount = roundMoney(input.savedAmount ?? 0);

    return goalRepository.create(userId, {
      name: input.name,
      targetAmount: input.targetAmount,
      savedAmount,
      currency: input.currency ?? 'INR',
      targetDate: input.targetDate,
      note: input.note,
      // A goal created already funded is completed on day one.
      status: statusAfterSaving('active', savedAmount, input.targetAmount),
    });
  }

  async list(
    userId: string,
    query: ListGoalsQuery
  ): Promise<IGoal[]> {
    // Filtering and sorting happen in the repository.
    return goalRepository.findManyForUser(userId, query);
  }

  async getById(userId: string, id: string): Promise<IGoal> {
    this.assertValidId(id);

    const goal = await goalRepository.findByIdForUser(id, userId);

    if (!goal) {
      throw new AppError('Goal not found', 404);
    }

    return goal;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateGoalInput
  ): Promise<IGoal> {
    this.assertValidId(id);

    const existing = await goalRepository.findByIdForUser(id, userId);

    if (!existing) {
      throw new AppError('Goal not found', 404);
    }

    // Build the update by hand so only validator-approved fields reach
    // MongoDB. `undefined` means "not sent" and must be skipped.
    // `note: null` is a real value, so it clears the field.
    const changes: Record<string, unknown> = {};

    if (input.name !== undefined) changes.name = input.name;
    if (input.targetAmount !== undefined) {
      changes.targetAmount = input.targetAmount;
    }
    if (input.savedAmount !== undefined) {
      changes.savedAmount = input.savedAmount;
    }
    if (input.currency !== undefined) changes.currency = input.currency;
    if (input.targetDate !== undefined) changes.targetDate = input.targetDate;
    if (input.note !== undefined) changes.note = input.note;
    if (input.status !== undefined) changes.status = input.status;

    // The user did not pick a status, so the auto rule may complete the goal.
    if (input.status === undefined) {
      const savedAmount = input.savedAmount ?? existing.savedAmount;
      const targetAmount = input.targetAmount ?? existing.targetAmount;
      const nextStatus = statusAfterSaving(
        existing.status,
        savedAmount,
        targetAmount
      );

      if (nextStatus !== existing.status) changes.status = nextStatus;
    }

    const updated = await goalRepository.updateForUser(id, userId, changes);

    // Mongoose returns null when the id is missing OR owned by someone else.
    // Both cases look the same from the outside: 404.
    if (!updated) {
      throw new AppError('Goal not found', 404);
    }

    return updated;
  }

  // Small dedicated action: it only adds money, it never rewrites the goal.
  async contribute(
    userId: string,
    id: string,
    input: ContributeGoalInput
  ): Promise<IGoal> {
    this.assertValidId(id);

    const goal = await goalRepository.findByIdForUser(id, userId);

    if (!goal) {
      throw new AppError('Goal not found', 404);
    }

    if (goal.status === 'cancelled') {
      throw new AppError('Cancelled goals cannot receive contributions', 400);
    }

    if (goal.status === 'completed') {
      throw new AppError('This goal is already completed', 400);
    }

    const savedAmount = roundMoney(goal.savedAmount + input.amount);

    const updated = await goalRepository.updateForUser(id, userId, {
      savedAmount,
      // Reaching the target completes the goal in the same write.
      status: statusAfterSaving(goal.status, savedAmount, goal.targetAmount),
    });

    if (!updated) {
      throw new AppError('Goal not found', 404);
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.assertValidId(id);

    const deleted = await goalRepository.deleteForUser(id, userId);

    if (!deleted) {
      throw new AppError('Goal not found', 404);
    }
  }
}

export const goalService = new GoalService();
