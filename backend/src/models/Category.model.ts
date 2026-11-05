import mongoose, { Document, Schema, Types } from 'mongoose';

export type CategoryType = 'income' | 'expense' | 'both';

export interface ICategory extends Document {
  user: Types.ObjectId;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  description?: string;
  // null = top-level category. A value points at the parent, so
  // Food -> Grocery, Restaurant is possible later.
  parent?: Types.ObjectId | null;
  // True for the categories seeded at registration. The service can use this
  // to block deleting or renaming them.
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Only full 6-digit hex colours, e.g. #22c55e.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const categorySchema = new Schema<ICategory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [40, 'Category name cannot exceed 40 characters'],
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'both'],
      // Most categories are for spending; "both" covers things like Other.
      default: 'expense',
    },
    // Lucide icon name shown in the UI, e.g. "Utensils", "Car", "Tag".
    icon: {
      type: String,
      trim: true,
      maxlength: [50, 'Icon name cannot exceed 50 characters'],
      default: 'Tag',
    },
    color: {
      type: String,
      trim: true,
      match: [HEX_COLOR, 'Color must be a hex value like #22c55e'],
      default: '#6b7280',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One name per user. strength: 2 makes "Food" and "food" the same name,
// so a user cannot end up with two near-identical categories.
categorySchema.index(
  { user: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// The category picker asks: "this user's categories for income/expense".
categorySchema.index({ user: 1, type: 1 });

// Children of a category (Food -> Grocery, Restaurant).
categorySchema.index({ user: 1, parent: 1 });

export const Category = mongoose.model<ICategory>(
  'Category',
  categorySchema
);
