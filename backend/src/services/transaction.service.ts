// ============================================================================
// Transaction service
//
// Business layer for /api/transactions.
// Order of layers: controller -> service -> repository -> model.
//
// Two rules live here:
//   1. A malformed id is a 400 before any query runs (no CastError -> 500).
//   2. A missing transaction is a 404, never an empty 200.
//
// Ownership is in every repository filter, so it cannot be skipped by a caller.
// ============================================================================

import mongoose, { Types } from 'mongoose';

import {
  TransactionRepository,
  type TransactionListResult,
} from '../repositories/transaction.repository.js';
import { AppError } from '../utils/AppError.js';
import type { ITransaction } from '../models/Transaction.model.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validator.js';

const transactionRepository = new TransactionRepository();

export class TransactionService {
  // The route validator already checks :id. This is the second layer:
  // never let an invalid id reach Mongoose, even if a route forgets the schema.
  private assertValidId(id: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid transaction id', 400);
    }
  }

  async create(
    userId: string,
    input: CreateTransactionInput
  ): Promise<ITransaction> {
    // Category existence/ownership is checked in Phase 5, once the Category
    // model exists. For now only the ObjectId format is validated.
    return transactionRepository.create(userId, {
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      category: new Types.ObjectId(input.category),
      description: input.description,
      date: input.date,
    });
  }

  async list(
    userId: string,
    query: ListTransactionsQuery
  ): Promise<TransactionListResult> {
    // Filtering, sorting and pagination all happen in the repository.
    return transactionRepository.findManyForUser(userId, query);
  }

  async getById(userId: string, id: string): Promise<ITransaction> {
    this.assertValidId(id);

    const transaction = await transactionRepository.findByIdForUser(id, userId);

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    return transaction;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateTransactionInput
  ): Promise<ITransaction> {
    this.assertValidId(id);

    // Build the update by hand so only validator-approved fields can reach
    // MongoDB. `undefined` means "not sent" and must be skipped.
    // `description: null` is a real value, so it clears the field.
    const changes: Record<string, unknown> = {};

    if (input.type !== undefined) changes.type = input.type;
    if (input.amount !== undefined) changes.amount = input.amount;
    if (input.currency !== undefined) changes.currency = input.currency;
    if (input.category !== undefined) {
      changes.category = new Types.ObjectId(input.category);
    }
    if (input.description !== undefined) changes.description = input.description;
    if (input.date !== undefined) changes.date = input.date;

    const transaction = await transactionRepository.updateForUser(
      id,
      userId,
      changes
    );

    // Mongoose returns null when the id does not exist OR belongs to another
    // user. Both cases must look the same from the outside: 404.
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    return transaction;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.assertValidId(id);

    const deleted = await transactionRepository.deleteForUser(id, userId);

    if (!deleted) {
      throw new AppError('Transaction not found', 404);
    }
  }
}

export const transactionService = new TransactionService();
