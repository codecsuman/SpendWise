// ============================================================================
// Budget service
//
// Business layer for /api/budgets.
// Order of layers: controller -> service -> repository -> model.
//
// Rules enforced here (none of them belong in the controller):
//   - a bad id is a 400 before any query runs
//   - a missing budget or category is a 404, never an empty 200
//   - the category must belong to the same user
//   - income categories cannot have a spending budget
//   - one budget per category per month (409 on a clash)
//   - "month" defaults to the current month when the client omits it
//   - spent / remaining / percent / status are calculated, never stored
// Ownership itself lives in every repository filter.
// ============================================================================

import mongoose, { Types } from 'mongoose';

import { BudgetRepository } from '../repositories/budget.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { AppError } from '../utils/AppError.js';
import type { IBudget } from '../models/Budget.model.js';
import type {
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
} from '../validators/budget.validator.js';

const budgetRepository = new BudgetRepository();
const categoryRepository = new CategoryRepository();
const transactionRepository = new TransactionRepository();

export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

// What the API returns for one budget row: the stored fields plus the
// calculated ones the UI needs.
export interface BudgetOverview {
  id: string;
  category: Types.ObjectId;
  amount: number;
  currency: string;
  month: string;
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
}

// "2026-11" in the server's local timezone.
function currentMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

// First and last millisecond of a "YYYY-MM" month, in UTC.
// Transactions are stored in UTC, so both sides compare the same way.
function monthRange(month: string): { from: Date; to: Date } {
  const [year, monthNumber] = month.split('-').map(Number);

  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1)),
    // Day 0 of the next month = last day of this month.
    to: new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999)),
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildOverview(budget: IBudget, spent: number): BudgetOverview {
  const amount = roundMoney(budget.amount);
  // One decimal is enough for a progress bar: 75.4%.
  const percent = Math.round((spent / amount) * 1000) / 10;

  return {
    id: String(budget._id),
    category: budget.category,
    amount,
    currency: budget.currency,
    month: budget.month,
    spent: roundMoney(spent),
    // Negative means the user is over budget. The UI can show "over by X".
    remaining: roundMoney(amount - spent),
    percent,
    status:
      percent >= 100 ? 'exceeded' : percent >= 90 ? 'warning' : 'normal',
  };
}

export class BudgetService {
  // The route validator already checks :id. This is the second layer:
  // never let an invalid id reach Mongoose.
  private assertValidId(id: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid budget id', 400);
    }
  }

  // The category must exist and belong to this user. An income category
  // would always show spent = 0, so it is rejected with a clear message.
  private async assertCategory(
    userId: string,
    categoryId: string
  ): Promise<void> {
    const category = await categoryRepository.findByIdForUser(
      categoryId,
      userId
    );

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category.type === 'income') {
      throw new AppError('Budgets are only for expense categories', 400);
    }
  }

  // Mirrors the unique index { user, category, month }.
  private async assertMonthFree(
    userId: string,
    categoryId: string,
    month: string,
    excludeId?: string
  ): Promise<void> {
    const taken = await budgetRepository.existsForCategoryMonth(
      userId,
      categoryId,
      month,
      excludeId
    );

    if (taken) {
      throw new AppError(
        'A budget for this category and month already exists',
        409
      );
    }
  }

  private async spentForMonth(
    userId: string,
    month: string
  ): Promise<Map<string, number>> {
    const { from, to } = monthRange(month);

    return transactionRepository.sumExpensesByCategory(userId, from, to);
  }

  private async spentForBudget(
    userId: string,
    budget: IBudget
  ): Promise<number> {
    const spent = await this.spentForMonth(userId, budget.month);

    return spent.get(String(budget.category)) ?? 0;
  }

  async create(
    userId: string,
    input: CreateBudgetInput
  ): Promise<BudgetOverview> {
    await this.assertCategory(userId, input.category);
    await this.assertMonthFree(userId, input.category, input.month);

    const budget = await budgetRepository.create(userId, {
      category: new Types.ObjectId(input.category),
      amount: input.amount,
      currency: input.currency,
      month: input.month,
    });

    // The month may already have transactions, so never assume spent is 0.
    const spent = await this.spentForBudget(userId, budget);

    return buildOverview(budget, spent);
  }

  async list(
    userId: string,
    query: ListBudgetsQuery
  ): Promise<BudgetOverview[]> {
    const month = query.month ?? currentMonth();

    const budgets = await budgetRepository.findManyForUser(userId, {
      ...query,
      month,
    });

    // One aggregation for the whole list, not one query per budget.
    const spent = await this.spentForMonth(userId, month);

    return budgets.map((budget) =>
      buildOverview(budget, spent.get(String(budget.category)) ?? 0)
    );
  }

  async getById(userId: string, id: string): Promise<BudgetOverview> {
    this.assertValidId(id);

    const budget = await budgetRepository.findByIdForUser(id, userId);

    if (!budget) {
      throw new AppError('Budget not found', 404);
    }

    return buildOverview(budget, await this.spentForBudget(userId, budget));
  }

  async update(
    userId: string,
    id: string,
    input: UpdateBudgetInput
  ): Promise<BudgetOverview> {
    this.assertValidId(id);

    const existing = await budgetRepository.findByIdForUser(id, userId);

    if (!existing) {
      throw new AppError('Budget not found', 404);
    }

    // Compare against the values that will exist after the update.
    const category = input.category ?? String(existing.category);
    const month = input.month ?? existing.month;

    if (input.category !== undefined) {
      await this.assertCategory(userId, input.category);
    }

    // Changing either key can collide with another budget. Pass the current
    // id so the row does not clash with itself.
    if (
      category !== String(existing.category) ||
      month !== existing.month
    ) {
      await this.assertMonthFree(userId, category, month, id);
    }

    // Build the update by hand so only validator-approved fields reach
    // MongoDB. `undefined` means "not sent" and must be skipped.
    const changes: Record<string, unknown> = {};

    if (input.category !== undefined) {
      changes.category = new Types.ObjectId(input.category);
    }
    if (input.amount !== undefined) changes.amount = input.amount;
    if (input.currency !== undefined) changes.currency = input.currency;
    if (input.month !== undefined) changes.month = input.month;

    const updated = await budgetRepository.updateForUser(id, userId, changes);

    if (!updated) {
      throw new AppError('Budget not found', 404);
    }

    return buildOverview(updated, await this.spentForBudget(userId, updated));
  }

  async remove(userId: string, id: string): Promise<void> {
    this.assertValidId(id);

    const deleted = await budgetRepository.deleteForUser(id, userId);

    if (!deleted) {
      throw new AppError('Budget not found', 404);
    }
  }
}

export const budgetService = new BudgetService();
