// ============================================================================
// analyticsApi.ts — the /api/analytics endpoint.
//
// One read-only slice: GET /api/analytics?month=YYYY-MM&months=6
// The backend returns { success, overview }, so components read data.overview.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
// ============================================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Mirrors CategoryBreakdown from backend analytics.service.ts.
export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  percent: number;
}

// Mirrors TrendPoint from backend analytics.service.ts.
export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

// Mirrors AnalyticsOverview from backend analytics.service.ts.
export interface AnalyticsOverview {
  month: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  categories: CategoryBreakdown[];
  trend: TrendPoint[];
}

// { success: true, overview }
export interface AnalyticsOverviewResponse {
  success: boolean;
  overview: AnalyticsOverview;
}

// GET filters. Omit month and the server uses the current month.
// fetchBaseQuery skips keys whose value is undefined.
export interface AnalyticsQuery {
  month?: string;
  months?: number;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const analyticsApi = createApi({
  reducerPath: "analyticsApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/analytics`,
    credentials: "include",
  }),

  // Read-only for now. Add this tag to transaction/budget mutations later
  // if you want the dashboard to refetch after money changes.
  tagTypes: ["Analytics"],

  endpoints: (builder) => ({
    // GET /api/analytics?month=2026-11&months=6
    getOverview: builder.query<
      AnalyticsOverviewResponse,
      AnalyticsQuery | void
    >({
      query: (params) => ({ url: "/", params: params ?? {} }),
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetOverviewQuery } = analyticsApi;
