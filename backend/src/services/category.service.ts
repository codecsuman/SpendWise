// ============================================================================
// Category service
//
// Business layer for /api/categories.
// Order of layers: controller -> service -> repository -> model.
//
// Rules enforced here (none of them belong in the controller):
//   - a bad id is a 400 before any query runs
//   - a missing category is a 404, never an empty 200
//   - names are unique per user, case-insensitively (409 on a clash)
//   - a parent must belong to the same user and must not create a cycle
//   - default categories cannot be renamed or deleted
//   - a category with children cannot be deleted
// Ownership itself lives in every repository filter.
// ============================================================================

import mongoose, { Types } from 'mongoose';

import { CategoryRepository } from '../repositories/category.repository.js';
import { AppError } from '../utils/AppError.js';
import type { ICategory } from '../models/Category.model.js';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from '../validators/category.validator.js';

const categoryRepository = new CategoryRepository();

// Categories every new user starts with. `seedDefaults()` inserts them once,
// right after registration.
export const DEFAULT_CATEGORIES: Array<
  Pick<ICategory, 'name' | 'type' | 'icon' | 'color'>
> = [
  { name: 'Food', type: 'expense', icon: 'Utensils', color: '#f97316' },
  { name: 'Transport', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#a855f7' },
  { name: 'Rent', type: 'expense', icon: 'Home', color: '#6366f1' },
  { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#0ea5e9' },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#ec4899' },
  { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Bills', type: 'expense', icon: 'Receipt', color: '#64748b' },
  { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#22c55e' },
  { name: 'Investment', type: 'both', icon: 'TrendingUp', color: '#14b8a6' },
  { name: 'Other', type: 'both', icon: 'Tag', color: '#6b7280' },
];

export class CategoryService {
  // The route validator already checks :id. This is the second layer:
  // never let an invalid id reach Mongoose, even if a route forgets the schema.
  private assertValidId(id: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid category id', 400);
    }
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string
  ): Promise<void> {
    const taken = await categoryRepository.nameExists(userId, name, excludeId);

    if (taken) {
      throw new AppError('A category with this name already exists', 409);
    }
  }

  // The parent must exist for this user. When editing, it also must not be
  // the category itself or one of its own descendants.
  private async assertValidParent(
    userId: string,
    parentId: string,
    categoryId?: string
  ): Promise<void> {
    if (categoryId && parentId === categoryId) {
      throw new AppError('A category cannot be its own parent', 400);
    }

    const parent = await categoryRepository.findByIdForUser(parentId, userId);

    if (!parent) {
      throw new AppError('Parent category not found', 404);
    }

    if (!categoryId) return;

    // Walk up from the chosen parent. If this category appears in that chain,
    // moving it under the parent would create a loop.
    const all = await categoryRepository.findManyForUser(userId, {
      sort: 'name',
    });
    const byId = new Map(all.map((item) => [String(item._id), item]));

    let cursorId: string | null = String(parent._id);

    while (cursorId) {
      if (cursorId === categoryId) {
        throw new AppError(
          'A category cannot be moved under its own subcategory',
          400
        );
      }

      const cursor = byId.get(cursorId);
      cursorId = cursor?.parent ? String(cursor.parent) : null;
    }
  }

  async create(
    userId: string,
    input: CreateCategoryInput
  ): Promise<ICategory> {
    await this.assertNameAvailable(userId, input.name);

    if (input.parent) {
      await this.assertValidParent(userId, input.parent);
    }

    return categoryRepository.create(userId, {
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      description: input.description,
      parent: input.parent ? new Types.ObjectId(input.parent) : null,
    });
  }

  async list(
    userId: string,
    query: ListCategoriesQuery
  ): Promise<ICategory[]> {
    // Filtering and sorting happen in the repository.
    return categoryRepository.findManyForUser(userId, query);
  }

  async getById(userId: string, id: string): Promise<ICategory> {
    this.assertValidId(id);

    const category = await categoryRepository.findByIdForUser(id, userId);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return category;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateCategoryInput
  ): Promise<ICategory> {
    this.assertValidId(id);

    const existing = await categoryRepository.findByIdForUser(id, userId);

    if (!existing) {
      throw new AppError('Category not found', 404);
    }

    // Default rows are shared behaviour for every new user: colour and icon
    // may change, but the name must stay stable.
    if (
      existing.isDefault &&
      input.name !== undefined &&
      input.name !== existing.name
    ) {
      throw new AppError('Default categories cannot be renamed', 400);
    }

    if (input.name !== undefined) {
      await this.assertNameAvailable(userId, input.name, id);
    }

    // Build the update by hand so only validator-approved fields reach
    // MongoDB. `undefined` means "not sent" and must be skipped;
    // `null` is a real value (clear description, move to top level).
    const changes: Record<string, unknown> = {};

    if (input.name !== undefined) changes.name = input.name;
    if (input.type !== undefined) changes.type = input.type;
    if (input.icon !== undefined) changes.icon = input.icon;
    if (input.color !== undefined) changes.color = input.color;
    if (input.description !== undefined) changes.description = input.description;

    if (input.parent !== undefined) {
      if (input.parent === null) {
        changes.parent = null;
      } else {
        await this.assertValidParent(userId, input.parent, id);
        changes.parent = new Types.ObjectId(input.parent);
      }
    }

    const updated = await categoryRepository.updateForUser(id, userId, changes);

    if (!updated) {
      throw new AppError('Category not found', 404);
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.assertValidId(id);

    const existing = await categoryRepository.findByIdForUser(id, userId);

    if (!existing) {
      throw new AppError('Category not found', 404);
    }

    if (existing.isDefault) {
      throw new AppError('Default categories cannot be deleted', 400);
    }

    // Deleting a parent would leave its children pointing at a missing row.
    // The user has to move or delete the children first.
    const all = await categoryRepository.findManyForUser(userId, {
      sort: 'name',
    });
    const hasChildren = all.some(
      (item) => item.parent && String(item.parent) === id
    );

    if (hasChildren) {
      throw new AppError('Move or delete the subcategories first', 409);
    }

    const deleted = await categoryRepository.deleteForUser(id, userId);

    if (!deleted) {
      throw new AppError('Category not found', 404);
    }
  }

  // Called once after registration. The length check makes it safe to run on
  // an account that already has categories.
  async seedDefaults(userId: string): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid user id', 400);
    }

    const existing = await categoryRepository.findManyForUser(userId, {
      sort: 'name',
    });

    if (existing.length > 0) return;

    for (const preset of DEFAULT_CATEGORIES) {
      await categoryRepository.create(userId, {
        ...preset,
        isDefault: true,
      });
    }
  }
}

export const categoryService = new CategoryService();
