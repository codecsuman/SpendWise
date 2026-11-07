// ============================================================================
// budgetApi.ts — the /api/budgets endpoints.
//
// One slice per base URL: authApi -> /api/auth, profileApi -> /api/users,
// transactionApi -> /api/transactions, categoryApi -> /api/categories,
// budgetApi -> /api/budgets.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
//
// The server does not store `spent`, `remaining`, `percent` or `status`.
// It calculates them from transactions on every read, so treat them as
// read-only values.
// ============================================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Keep this list identical to the enum in backend Budget.model.ts.
export type Currency = "INR" | "USD" | "EUR" | "GBP" | "CAD" | "AUD";
export type BudgetSort = "newest" | "highest";
export type BudgetStatus = "normal" | "warning" | "exceeded";

// Mirrors BudgetOverview from budget.service.ts.
// `category` is a plain id string here; join it with the categories list to
// show a name, icon or colour.
export interface Budget {
  id: string;
  category: string;
  amount: number;
  currency: Currency;
  month: string;
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
}

// { success: true, budget } — create / get / update
export interface BudgetResponse {
  success: boolean;
  budget: Budget;
}

// { success: true, budgets } — list (no pagination)
export interface BudgetListResponse {
  success: boolean;
  budgets: Budget[];
}

// GET filters. fetchBaseQuery skips keys whose value is undefined.
// Omit `month` and the server uses the current month.
export interface BudgetListQuery {
  month?: string;
  category?: string;
  sort?: BudgetSort;
}

// POST body.
export interface CreateBudgetInput {
  category: string;
  amount: number;
  currency?: Currency;
  month: string;
}

// PATCH sends only the fields that changed.
export type UpdateBudgetInput = Partial<CreateBudgetInput>;

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const budgetApi = createApi({
  reducerPath: "budgetApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/budgets`,
    credentials: "include",
  }),

  // One tag is enough: any change refetches every open budget query.
  tagTypes: ["Budget"],

  endpoints: (builder) => ({
    // GET /api/budgets?month=2026-11&sort=highest
    listBudgets: builder.query<BudgetListResponse, BudgetListQuery | void>({
      query: (params) => ({ url: "/", params: params ?? {} }),
      providesTags: ["Budget"],
    }),

    // GET /api/budgets/:id
    getBudget: builder.query<BudgetResponse, string>({
      query: (id) => `/${id}`,
      providesTags: ["Budget"],
    }),

    // POST /api/budgets
    createBudget: builder.mutation<BudgetResponse, CreateBudgetInput>({
      query: (body) => ({ url: "/", method: "POST", body }),
      invalidatesTags: ["Budget"],
    }),

    // PATCH /api/budgets/:id
    updateBudget: builder.mutation<
      BudgetResponse,
      { id: string; data: UpdateBudgetInput }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Budget"],
    }),

    // DELETE /api/budgets/:id
    deleteBudget: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/${id}`, method: "DELETE" }),
      invalidatesTags: ["Budget"],
    }),
  }),
});

// Auto-generated hooks: the names come from the endpoint keys above.
export const {
  useListBudgetsQuery,
  useGetBudgetQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;
