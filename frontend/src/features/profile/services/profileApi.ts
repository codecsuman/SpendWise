// ============================================================================
// profileApi.ts — the /api/users endpoints.
//
// A second RTK Query slice, because authApi's baseUrl is /api/auth.
// One slice per base URL keeps the URLs short and readable.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
// ============================================================================

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { authApi, type AuthUser } from '../../auth/services/authApi'

// The backend answers { success: true, user }.
export interface UserResponse {
  success: boolean
  user: AuthUser
}

// Every field is optional: PATCH sends only what the user actually changed.
export interface UpdateProfileInput {
  name?: string
  currency?: string
  timezone?: string
  language?: string
}

// Password fields are send-only. They never come back from the server.
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export const profileApi = createApi({
  reducerPath: 'profileApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/users`,
    credentials: 'include',
  }),

  tagTypes: ['Profile'],

  endpoints: (builder) => ({
    // GET /api/users/me
    getProfile: builder.query<UserResponse, void>({
      query: () => '/me',
      providesTags: ['Profile'],
    }),

    // PATCH /api/users/me
    updateProfile: builder.mutation<UserResponse, UpdateProfileInput>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      invalidatesTags: ['Profile'],

      // authApi.getMe has its own separate cache. Without this, the name in the
      // navbar stays old until a full page reload. Invalidating authApi's
      // "User" tag makes the navbar refetch the moment the save succeeds.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(authApi.util.invalidateTags(['User']))
        } catch {
          // The form shows the error, so there is nothing to do here.
        }
      },
    }),

    // PATCH /api/users/me/password
    changePassword: builder.mutation<
      { success: boolean; message: string },
      ChangePasswordInput
    >({
      query: (body) => ({ url: '/me/password', method: 'PATCH', body }),
    }),
  }),
})

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = profileApi
