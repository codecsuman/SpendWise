import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { API_URL } from "../../../config/api";

interface Notification {
  _id: string;
  type: "budget_alert" | "goal_reminder";
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/notifications`,
    credentials: "include",
  }),
  tagTypes: ["Notification"],
  endpoints: (builder) => ({
    listNotifications: builder.query<
      { success: boolean; notifications: Notification[] },
      string
    >({
      // The user ID keys the cache. The backend uses the session cookie.
      query: () => "",
      providesTags: ["Notification"],
      keepUnusedDataFor: 0,
    }),
    markNotificationAsRead: builder.mutation<
      { success: boolean; notification: Notification },
      string
    >({
      query: (id) => ({
        url: `${encodeURIComponent(id)}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const { useListNotificationsQuery, useMarkNotificationAsReadMutation } =
  notificationApi;
