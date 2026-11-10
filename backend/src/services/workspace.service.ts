// ============================================================================
// Workspace service
//
// Business layer for /api/workspace/notes.
// Order of layers: controller -> service -> repository -> model.
//
// Rules enforced here:
//   - a bad id is a 400 before any query runs
//   - a missing note (or another user's note) is a 404
//   - an empty title becomes "Untitled note"
//   - a linked resource id is converted to an ObjectId once, here
//   - tags are trimmed and capped by the validator before they arrive
// Ownership itself lives in every repository filter.
// ============================================================================

import mongoose, { Types } from 'mongoose';

import type { INote, INoteLink } from '../models/Note.model.js';
import { WorkspaceRepository } from '../repositories/workspace.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  CreateNoteInput,
  ListNotesQuery,
  UpdateNoteInput,
} from '../validators/workspace.validator.js';

const workspaceRepository = new WorkspaceRepository();

export interface NoteListResult {
  notes: INote[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Validator ids are strings. Mongo stores ObjectIds, so convert here once.
function toLinks(
  links: Array<{ type: INoteLink['type']; id: string; label: string }>
): INoteLink[] {
  return links.map((link) => ({
    type: link.type,
    id: new Types.ObjectId(link.id),
    label: link.label,
  }));
}

export class WorkspaceService {
  // The route validator already checks :id. This is the second layer:
  // never let an invalid id reach Mongoose.
  private assertValidId(id: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid note id', 400);
    }
  }

  async create(userId: string, input: CreateNoteInput): Promise<INote> {
    return workspaceRepository.create(userId, {
      title: input.title?.trim() || 'Untitled note',
      content: input.content ?? '',
      tags: input.tags ?? [],
      folder: input.folder ?? null,
      color: input.color ?? 'teal',
      pinned: input.pinned ?? false,
      archived: false,
      links: toLinks(input.links ?? []),
    });
  }

  async list(
    userId: string,
    query: ListNotesQuery
  ): Promise<NoteListResult> {
    const { notes, total } = await workspaceRepository.findManyForUser(
      userId,
      query
    );

    return {
      notes,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getById(userId: string, id: string): Promise<INote> {
    this.assertValidId(id);

    const note = await workspaceRepository.findByIdForUser(id, userId);

    if (!note) {
      throw new AppError('Note not found', 404);
    }

    return note;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateNoteInput
  ): Promise<INote> {
    this.assertValidId(id);

    const existing = await workspaceRepository.findByIdForUser(id, userId);

    if (!existing) {
      throw new AppError('Note not found', 404);
    }

    // Build the update by hand so only validator-approved fields reach
    // MongoDB. `undefined` means "not sent" and must be skipped.
    const changes: Record<string, unknown> = {};

    if (input.title !== undefined) {
      changes.title = input.title.trim() || 'Untitled note';
    }
    if (input.content !== undefined) changes.content = input.content;
    if (input.tags !== undefined) changes.tags = input.tags;
    if (input.folder !== undefined) changes.folder = input.folder;
    if (input.color !== undefined) changes.color = input.color;
    if (input.pinned !== undefined) changes.pinned = input.pinned;
    if (input.archived !== undefined) changes.archived = input.archived;
    if (input.links !== undefined) changes.links = toLinks(input.links);

    const updated = await workspaceRepository.updateForUser(
      id,
      userId,
      changes
    );

    // Mongoose returns null when the id is missing OR owned by someone else.
    // Both cases look the same from the outside: 404.
    if (!updated) {
      throw new AppError('Note not found', 404);
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.assertValidId(id);

    const deleted = await workspaceRepository.deleteForUser(id, userId);

    if (!deleted) {
      throw new AppError('Note not found', 404);
    }
  }
}

export const workspaceService = new WorkspaceService();
