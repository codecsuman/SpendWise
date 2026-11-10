import mongoose, { Document, Schema, Types } from 'mongoose';

// Keep these lists identical to the frontend workspace.types.ts.
export const NOTE_COLORS = [
  'teal',
  'indigo',
  'amber',
  'rose',
  'green',
  'slate',
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export type NoteResourceType =
  | 'transaction'
  | 'budget'
  | 'goal'
  | 'category';

// A link stores the record type and id, plus a label captured at link time.
// The note never copies the transaction/budget/goal content.
export interface INoteLink {
  type: NoteResourceType;
  id: Types.ObjectId;
  label: string;
}

export interface INote extends Document {
  user: Types.ObjectId;
  title: string;
  // Plain text only. The UI never renders user HTML.
  content: string;
  tags: string[];
  // A free-form folder name. null means "no folder".
  folder: string | null;
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  links: INoteLink[];
  createdAt: Date;
  updatedAt: Date;
}

const noteLinkSchema = new Schema<INoteLink>(
  {
    type: {
      type: String,
      enum: ['transaction', 'budget', 'goal', 'category'],
      required: true,
    },
    id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [120, 'Link label must be at most 120 characters'],
    },
  },
  { _id: false }
);

const noteSchema = new Schema<INote>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Title must be at most 120 characters'],
      default: '',
    },
    content: {
      type: String,
      maxlength: [50_000, 'Note content is too long'],
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 10,
        message: 'A note can have at most 10 tags',
      },
    },
    folder: {
      type: String,
      trim: true,
      maxlength: [40, 'Folder name must be at most 40 characters'],
      default: null,
    },
    color: {
      type: String,
      enum: NOTE_COLORS,
      default: 'teal',
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    links: {
      type: [noteLinkSchema],
      default: [],
      validate: {
        validator: (links: INoteLink[]) => links.length <= 20,
        message: 'A note can link at most 20 records',
      },
    },
  },
  { timestamps: true }
);

// "Show this user's notes, pinned first, newest first."
noteSchema.index({ user: 1, archived: 1, pinned: -1, updatedAt: -1 });

// "Show the notes inside one folder."
noteSchema.index({ user: 1, folder: 1, updatedAt: -1 });

// "Find notes that carry one tag."
noteSchema.index({ user: 1, tags: 1 });

export const Note = mongoose.model<INote>('Note', noteSchema);
