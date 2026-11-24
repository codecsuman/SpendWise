// ============================================================================
// authApi.ts — every auth endpoint the frontend can call, in one place.
//
// Why RTK Query instead of axios?
//   It stores the server's answer in Redux for us, tells us when it is
//   loading, caches it, and can refetch automatically after a login/logout.
//   We write the endpoint once and get a ready-made hook (useLoginMutation).
//
// Every request here sends cookies, because the tokens live in httpOnly
// cookies and never in JavaScript.
// ============================================================================

import { API_URL } from '../../../config/api'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// --- TYPES -----------------------------------------------------------------
// These mirror PublicUser in backend/src/services/auth.service.ts.
// Keep them in sync: the backend is the source of truth.
export interface AuthUser {
  id: string
  name: string
  avatarUrl?: string
  email: string
  currency: string
  timezone: string
  language: string
  emailVerified: boolean
  googleLinked: boolean
  // JSON has no Date type, so the server sends a string like
  // "2026-10-28T10:00:00.000Z". Wrap it with new Date(...) when displaying.
  createdAt: string
}

// Shape of a successful response from /login, /register and /me.
export interface AuthResponse {
  success: boolean
  user: AuthUser
}

// What we POST. The password is sent once and never stored.
export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  code?: string
}

type StatusResponse = { success: boolean; message: string }

// Base URL in one place. VITE_* values are PUBLIC (they ship in the bundle),
// which is fine here because this is just an address, not a secret.
// --- THE API SLICE ---------------------------------------------------------
export const authApi = createApi({
  // The key this slice's data is stored under in the Redux store.
  reducerPath: 'authApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/auth`,
    // fetch does NOT send cookies cross-origin unless you ask.
    // This is the fetch equivalent of axios's withCredentials: true.
    credentials: 'include',
  }),

  // Tags are cache labels. When a mutation invalidates "User", every query
  // that provides "User" (here: getMe) refetches automatically.
  tagTypes: ['User'],

  endpoints: (builder) => ({
    authOptions: builder.query<{ emailCodes: boolean }, void>({
      query: () => '/options',
    }),

    // POST /api/auth/login -> sets the auth cookies
    login: builder.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    // POST /api/auth/register -> creates the user and logs them in
    register: builder.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: '/register', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    sendSignupCode: builder.mutation<StatusResponse, { email: string }>({
      query: (body) => ({ url: '/register/code', method: 'POST', body }),
    }),

    forgotPassword: builder.mutation<StatusResponse, { email: string }>({
      query: (body) => ({ url: '/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<StatusResponse, { email: string; code: string; password: string }>({
      query: (body) => ({ url: '/reset-password', method: 'POST', body }),
      invalidatesTags: (_result, error) => error ? [] : ['User'],
    }),

    sendEmailVerificationCode: builder.mutation<StatusResponse, void>({
      query: () => ({ url: '/email/code', method: 'POST', body: {} }),
    }),

    verifyEmail: builder.mutation<AuthResponse, { code: string }>({
      query: (body) => ({ url: '/email/verify', method: 'POST', body }),
      invalidatesTags: (_result, error) => error ? [] : ['User'],
    }),

    googleLogin: builder.mutation<AuthResponse, { credential: string }>({
      query: (body) => ({ url: '/google', method: 'POST', body }),
      invalidatesTags: (_result, error) => error ? [] : ['User'],
    }),

    googleLink: builder.mutation<AuthResponse, { credential: string }>({
      query: (body) => ({ url: '/google/link', method: 'POST', body }),
      invalidatesTags: (_result, error) => error ? [] : ['User'],
    }),

    // POST /api/auth/logout -> revokes the refresh token, clears cookies.
    // Needs the access-token cookie, so it only works while logged in.
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({ url: '/logout', method: 'POST' }),
      invalidatesTags: ['User'],
    }),

    // GET /api/auth/me -> "who am I?"
    // Called on app start: if the cookies are still valid we get the user,
    // if not we get a 401 and know the visitor is a guest.
    getMe: builder.query<AuthResponse, void>({
      query: () => '/me',
      providesTags: ['User'],
    }),
  }),
})

// Auto-generated hooks. The names come from the endpoint keys above:
// login -> useLoginMutation, getMe -> useGetMeQuery.
export const {
  useAuthOptionsQuery,
  useLoginMutation,
  useRegisterMutation,
  useSendSignupCodeMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSendEmailVerificationCodeMutation,
  useVerifyEmailMutation,
  useGoogleLoginMutation,
  useGoogleLinkMutation,
  useLogoutMutation,
  useGetMeQuery,
} = authApi
