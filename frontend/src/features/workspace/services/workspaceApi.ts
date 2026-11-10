// ============================================================================
// workspaceApi.ts — the /api/workspace/notes endpoints.
//
// One slice per feature, like goalApi and budgetApi.
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
//
// The backend sends raw Mongoose documents here, so the id field is `_id`.
// ============================================================================

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import type {
  CreateNoteInput,
  DeleteNoteResponse,
  NoteListQuery,
  NoteListResponse,
  NoteResponse,
  UpdateNoteInput,
} from '../types/workspace.types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// RTK Query puts the server's JSON body on error.data. Every other page has
// its own copy of this helper; keeping one here avoids four more copies.
export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; errors?: string } }).data
    if (data && typeof data.message === 'string') {
      return data.errors ? `${data.message}: ${data.errors}` : data.message
    }
  }

  return 'Something went wrong. Please try again.'
}

export const workspaceApi = createApi({
  reducerPath: 'workspaceApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/workspace`,
    credentials: 'include',
  }),

  // One tag is enough: any note change refetches the open list and editor.
  tagTypes: ['Note'],

  endpoints: (builder) => ({
    // GET /api/workspace/notes?search=&tag=&folder=&sort=&page=1
    listNotes: builder.query<NoteListResponse, NoteListQuery | void>({
      query: (params) => ({ url: '/notes', params: params ?? {} }),
      providesTags: ['Note'],
    }),

    // GET /api/workspace/notes/:id
    getNote: builder.query<NoteResponse, string>({
      query: (id) => `/notes/${id}`,
      providesTags: ['Note'],
    }),

    // POST /api/workspace/notes
    createNote: builder.mutation<NoteResponse, CreateNoteInput>({
      query: (body) => ({ url: '/notes', method: 'POST', body }),
      invalidatesTags: ['Note'],
    }),

    // PATCH /api/workspace/notes/:id
    updateNote: builder.mutation<
      NoteResponse,
      { id: string; data: UpdateNoteInput }
    >({
      query: ({ id, data }) => ({
        url: `/notes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Note'],
    }),

    // DELETE /api/workspace/notes/:id
    deleteNote: builder.mutation<DeleteNoteResponse, string>({
      query: (id) => ({ url: `/notes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Note'],
    }),
  }),
})

// Auto-generated hooks: the names come from the endpoint keys above.
export const {
  useListNotesQuery,
  useGetNoteQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} = workspaceApi
