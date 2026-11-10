// ============================================================================
// Workspace repository
//
// The database layer for notes. Every query starts with `user: userId`, so a
// note id taken from the URL can never reach another account.
//
// Search uses a case-insensitive regex. The user's text is escaped first, so
// a value like ".*" is treated as literal text instead of a regex.
// ============================================================================

import { QueryFilter, UpdateQuery } from 'mongoose';

import { INote, Note } from '../models/Note.model.js';
import type { ListNotesQuery } from '../validators/workspace.validator.js';

type SortOption = ListNotesQuery['sort'];

const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  updated: { updatedAt: -1 },
  created: { createdAt: -1 },
  title: { title: 1 },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter(
  userId: string,
  query: ListNotesQuery
): QueryFilter<INote> {
  const filter: QueryFilter<INote> = {
    user: userId,
    // Archived notes are a separate view, not part of "All notes".
    archived: query.archived ?? false,
  };

  if (query.folder) filter.folder = query.folder;
  if (query.tag) filter.tags = { $in: [query.tag] };
  if (query.pinned !== undefined) filter.pinned = query.pinned;

  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { title: pattern },
      { content: pattern },
      { tags: pattern },
    ];
  }

  return filter;
}

export class WorkspaceRepository {
  async create(userId: string, data: Partial<INote>): Promise<INote> {
    // `user` comes from the token, never from the request body.
    return Note.create({ ...data, user: userId });
  }

  // Ownership lives in the filter, not in a check after the read.
  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<INote | null> {
    return Note.findOne({ _id: id, user: userId }).exec();
  }

  async findManyForUser(
    userId: string,
    query: ListNotesQuery
  ): Promise<{ notes: INote[]; total: number }> {
    const filter = buildFilter(userId, query);
    const skip = (query.page - 1) * query.limit;

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ pinned: -1, ...SORT_MAP[query.sort] })
        .skip(skip)
        .limit(query.limit)
        .exec(),
      Note.countDocuments(filter).exec(),
    ]);

    return { notes, total };
  }

  async updateForUser(
    id: string,
    userId: string,
    data: UpdateQuery<INote>
  ): Promise<INote | null> {
    return Note.findOneAndUpdate({ _id: id, user: userId }, data, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const deleted = await Note.findOneAndDelete({
      _id: id,
      user: userId,
    }).exec();

    return !!deleted;
  }
}
