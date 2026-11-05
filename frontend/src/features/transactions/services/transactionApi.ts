// ============================================================================
// transactionApi.ts — the /api/transactions endpoints.
//
// One slice per base URL: authApi -> /api/auth, profileApi -> /api/users,
// transactionApi -> /api/transactions.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
// ============================================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Keep these lists identical to the enums in backend Transaction.model.ts.
export type TransactionType = "income" | "expense";
export type TransactionCurrency = "INR" | "USD" | "EUR" | "GBP" | "CAD" | "AUD";
export type TransactionSort = "newest" | "oldest" | "highest" | "lowest";

// Mirrors ITransaction. JSON has no Date, so dates arrive as ISO strings.
// Wrap with new Date(...) when formatting for display.
export interface Transaction {
  _id: string;
  user: string;
  type: TransactionType;
  amount: number;
  currency: TransactionCurrency;
  category: string;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// { success: true, transaction } — create / get / update
export interface TransactionResponse {
  success: boolean;
  transaction: Transaction;
}

// { success: true, transactions, pagination } — list
export interface TransactionListResponse {
  success: boolean;
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// GET filters. Everything is optional: {} means page 1, newest first.
// fetchBaseQuery turns this object into ?page=1&type=expense&sort=newest
// and skips keys whose value is undefined.
export interface TransactionListQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: TransactionSort;
}

// POST body. currency and date are optional on the server (it has defaults).
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  currency?: TransactionCurrency;
  category: string;
  description?: string;
  date?: string;
}

// PATCH sends only the fields that changed.
export type UpdateTransactionInput = Partial<CreateTransactionInput>;

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const transactionApi = createApi({
  reducerPath: "transactionApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/transactions`,
    credentials: "include",
  }),

  // One tag is enough for now: any change refetches every open transaction
  // query. Split it per id later if the list grows large.
  tagTypes: ["Transaction"],

  endpoints: (builder) => ({
    // GET /api/transactions?page=1&limit=20...
    listTransactions: builder.query<
      TransactionListResponse,
      TransactionListQuery | void
    >({
      query: (params) => ({ url: "/", params: params ?? {} }),
      providesTags: ["Transaction"],
    }),

    // GET /api/transactions/:id
    getTransaction: builder.query<TransactionResponse, string>({
      query: (id) => `/${id}`,
      providesTags: ["Transaction"],
    }),

    // POST /api/transactions
    createTransaction: builder.mutation<
      TransactionResponse,
      CreateTransactionInput
    >({
      query: (body) => ({ url: "/", method: "POST", body }),
      invalidatesTags: ["Transaction"],
    }),

    // PATCH /api/transactions/:id
    updateTransaction: builder.mutation<
      TransactionResponse,
      { id: string; data: UpdateTransactionInput }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Transaction"],
    }),

    // DELETE /api/transactions/:id
    deleteTransaction: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/${id}`, method: "DELETE" }),
      invalidatesTags: ["Transaction"],
    }),
  }),
});

// Auto-generated hooks: the names come from the endpoint keys above.
// listTransactions -> useListTransactionsQuery, createTransaction -> useCreateTransactionMutation.
export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionApi;
