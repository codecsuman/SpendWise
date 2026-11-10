// ============================================================================
// recurringApi.ts — the /api/recurring endpoints.
//
// One slice per base URL: authApi -> /api/auth, profileApi -> /api/users,
// transactionApi -> /api/transactions, categoryApi -> /api/categories,
// budgetApi -> /api/budgets, goalApi -> /api/goals, recurringApi -> /api/recurring.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
//
// The backend sends raw Mongoose documents here, so the id field is `_id`.
// `category` is NOT populated: it arrives as a plain ObjectId string, and the
// page looks the name up from the categories list it already loads.
//
// The backend answers { success: true, recurring } for both a single rule and
// the list, so both response types share one key.
// ============================================================================

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Keep these lists identical to the enums in backend RecurringTransaction.model.ts.
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'
export type RecurringType = 'income' | 'expense'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RecurringSort = 'newest' | 'nextRun'

// Mirrors the JSON Mongoose sends for one RecurringTransaction document.
export interface RecurringTransaction {
  _id: string
  user: string
  type: RecurringType
  amount: number
  currency: Currency
  // Plain ObjectId string — not populated by the backend.
  category: string
  description?: string
  frequency: RecurrenceFrequency
  // Every N frequencies: 1 = every month, 3 = every 3 months.
  interval: number
  startDate: string
  nextRunAt: string
  endDate?: string
  lastRunAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// { success: true, recurring } — create / get / update / pause
export interface RecurringResponse {
  success: boolean
  recurring: RecurringTransaction
}

// { success: true, recurring } — list (same key, different type)
export interface RecurringListResponse {
  success: boolean
  recurring: RecurringTransaction[]
}

// GET filters. fetchBaseQuery skips keys whose value is undefined.
export interface RecurringListQuery {
  // Text on purpose: the backend validates with z.enum(['true', 'false']).
  isActive?: 'true' | 'false'
  frequency?: RecurrenceFrequency
  sort?: RecurringSort
}

// POST body. currency, interval and isActive are optional; the server fills
// them in. nextRunAt is NOT here: the server derives it from startDate.
export interface CreateRecurringInput {
  type: RecurringType
  amount: number
  currency?: Currency
  category: string
  description?: string
  frequency: RecurrenceFrequency
  interval?: number
  startDate: string
  endDate?: string
  isActive?: boolean
}

// PATCH sends only the fields that changed. `description: null` clears it.
export interface UpdateRecurringInput {
  type?: RecurringType
  amount?: number
  currency?: Currency
  category?: string
  description?: string | null
  frequency?: RecurrenceFrequency
  interval?: number
  startDate?: string
  endDate?: string | null
  isActive?: boolean
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export const recurringApi = createApi({
  reducerPath: 'recurringApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/recurring`,
    credentials: 'include',
  }),

  // One tag is enough: any change refetches every open recurring query.
  tagTypes: ['Recurring'],

  endpoints: (builder) => ({
    // GET /api/recurring?isActive=true&frequency=monthly&sort=nextRun
    listRecurring: builder.query<
      RecurringListResponse,
      RecurringListQuery | void
    >({
      query: (params) => ({ url: '/', params: params ?? {} }),
      providesTags: ['Recurring'],
    }),

    // GET /api/recurring/:id
    getRecurring: builder.query<RecurringResponse, string>({
      query: (id) => `/${id}`,
      providesTags: ['Recurring'],
    }),

    // POST /api/recurring
    createRecurring: builder.mutation<RecurringResponse, CreateRecurringInput>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      invalidatesTags: ['Recurring'],
    }),

    // PATCH /api/recurring/:id
    updateRecurring: builder.mutation<
      RecurringResponse,
      { id: string; data: UpdateRecurringInput }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Recurring'],
    }),

    // Pause / resume is just a one-field PATCH, but it is the most common
    // action on this page, so it gets its own hook.
    setRecurringActive: builder.mutation<
      RecurringResponse,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: { isActive } satisfies UpdateRecurringInput,
      }),
      invalidatesTags: ['Recurring'],
    }),

    // DELETE /api/recurring/:id
    deleteRecurring: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Recurring'],
    }),
  }),
})

// Auto-generated hooks: the names come from the endpoint keys above.
export const {
  useListRecurringQuery,
  useGetRecurringQuery,
  useCreateRecurringMutation,
  useUpdateRecurringMutation,
  useSetRecurringActiveMutation,
  useDeleteRecurringMutation,
} = recurringApi
