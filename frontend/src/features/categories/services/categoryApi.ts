// ============================================================================
// categoryApi.ts — the /api/categories endpoints.
//
// One slice per base URL: authApi -> /api/auth, profileApi -> /api/users,
// transactionApi -> /api/transactions, categoryApi -> /api/categories.
//
// Requests must use credentials: 'include', otherwise the browser drops the
// httpOnly access-token cookie and every call answers 401.
// ============================================================================

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Keep this list identical to the enum in backend Category.model.ts.
export type CategoryType = 'income' | 'expense' | 'both'
export type CategorySort = 'name' | 'newest'

// Mirrors ICategory. JSON has no Date, so timestamps arrive as ISO strings.
export interface Category {
  _id: string
  user: string
  name: string
  type: CategoryType
  icon: string
  color: string
  description?: string
  // null or undefined means top-level.
  parent?: string | null
  // True for the categories seeded at registration.
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// { success: true, category } — create / get / update
export interface CategoryResponse {
  success: boolean
  category: Category
}

// { success: true, categories } — list (no pagination)
export interface CategoryListResponse {
  success: boolean
  categories: Category[]
}

// GET filters. fetchBaseQuery skips keys whose value is undefined.
export interface CategoryListQuery {
  type?: CategoryType
  search?: string
  sort?: CategorySort
}

// POST body. The server applies model defaults for missing fields.
export interface CreateCategoryInput {
  name: string
  type?: CategoryType
  icon?: string
  color?: string
  description?: string
  parent?: string | null
}

// PATCH sends only the fields that changed.
export type UpdateCategoryInput = Partial<CreateCategoryInput>

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export const categoryApi = createApi({
  reducerPath: 'categoryApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/categories`,
    credentials: 'include',
  }),

  // One tag is enough: any change refetches every open category query.
  tagTypes: ['Category'],

  endpoints: (builder) => ({
    // GET /api/categories?type=expense&search=food&sort=name
    listCategories: builder.query<
      CategoryListResponse,
      CategoryListQuery | void
    >({
      query: (params) => ({ url: '/', params: params ?? {} }),
      providesTags: ['Category'],
    }),

    // GET /api/categories/:id
    getCategory: builder.query<CategoryResponse, string>({
      query: (id) => `/${id}`,
      providesTags: ['Category'],
    }),

    // POST /api/categories
    createCategory: builder.mutation<CategoryResponse, CreateCategoryInput>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),

    // PATCH /api/categories/:id
    updateCategory: builder.mutation<
      CategoryResponse,
      { id: string; data: UpdateCategoryInput }
    >({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),

    // DELETE /api/categories/:id
    deleteCategory: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Category'],
    }),
  }),
})

// Auto-generated hooks: the names come from the endpoint keys above.
export const {
  useListCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi
