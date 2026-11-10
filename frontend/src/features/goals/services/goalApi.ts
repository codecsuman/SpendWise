// ============================================================================
// goalApi.ts — the /api/goals endpoints.
//
// One slice per base URL: authApi -> /api/auth, profileApi -> /api/users,
// transactionApi -> /api/transactions, categoryApi -> /api/categories,
// budgetApi -> /api/budgets, goalApi -> /api/goals.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
//
// The backend sends raw Mongoose documents here, so the id field is `_id`
// (not `id` like the budget endpoints, which map it by hand).
// ============================================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Keep these lists identical to the enums in backend Goal.model.ts.
export type Currency = "INR" | "USD" | "EUR" | "GBP" | "CAD" | "AUD";
export type GoalStatus = "active" | "completed" | "cancelled";
export type GoalSort = "target" | "newest" | "progress";

// Mirrors the JSON Mongoose sends for one Goal document.
export interface Goal {
  _id: string;
  user: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  currency: Currency;
  targetDate: string;
  note?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

// { success: true, goal } — create / get / update / contribute
export interface GoalResponse {
  success: boolean;
  goal: Goal;
}

// { success: true, goals } — list (no pagination)
export interface GoalListResponse {
  success: boolean;
  goals: Goal[];
}

// GET filters. fetchBaseQuery skips keys whose value is undefined.
export interface GoalListQuery {
  status?: GoalStatus;
  sort?: GoalSort;
}

// POST body. savedAmount and currency are optional; the server fills them in.
export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  currency?: Currency;
  targetDate: string;
  note?: string;
}

// PATCH sends only the fields that changed. `note: null` clears the note.
export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  savedAmount?: number;
  currency?: Currency;
  targetDate?: string;
  note?: string | null;
  status?: GoalStatus;
}

// POST /api/goals/:id/contribute body.
export interface ContributeGoalInput {
  amount: number;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const goalApi = createApi({
  reducerPath: "goalApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/goals`,
    credentials: "include",
  }),

  // One tag is enough: any change refetches every open goal query.
  tagTypes: ["Goal"],

  endpoints: (builder) => ({
    // GET /api/goals?status=active&sort=progress
    listGoals: builder.query<GoalListResponse, GoalListQuery | void>({
      query: (params) => ({ url: "/", params: params ?? {} }),
      providesTags: ["Goal"],
    }),

    // GET /api/goals/:id
    getGoal: builder.query<GoalResponse, string>({
      query: (id) => `/${id}`,
      providesTags: ["Goal"],
    }),

    // POST /api/goals
    createGoal: builder.mutation<GoalResponse, CreateGoalInput>({
      query: (body) => ({ url: "/", method: "POST", body }),
      invalidatesTags: ["Goal"],
    }),

    // PATCH /api/goals/:id
    updateGoal: builder.mutation<
      GoalResponse,
      { id: string; data: UpdateGoalInput }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Goal"],
    }),

    // POST /api/goals/:id/contribute
    contributeToGoal: builder.mutation<
      GoalResponse,
      { id: string; amount: number }
    >({
      query: ({ id, amount }) => ({
        url: `/${id}/contribute`,
        method: "POST",
        body: { amount } satisfies ContributeGoalInput,
      }),
      invalidatesTags: ["Goal"],
    }),

    // DELETE /api/goals/:id
    deleteGoal: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/${id}`, method: "DELETE" }),
      invalidatesTags: ["Goal"],
    }),
  }),
});

// Auto-generated hooks: the names come from the endpoint keys above.
export const {
  useListGoalsQuery,
  useGetGoalQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useContributeToGoalMutation,
  useDeleteGoalMutation,
} = goalApi;
