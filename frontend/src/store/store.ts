// ============================================================================
// store.ts — the single Redux store for the whole app.
//
// A "store" is one JavaScript object that holds all shared state. Components
// read from it with hooks instead of passing props down through 5 levels.
//
// Right now the only reducer is authApi. As features arrive (transactions,
// budgets, goals) each one adds a line here.
// ============================================================================

import { configureStore } from '@reduxjs/toolkit'
import { authApi } from '../features/auth/services/authApi'
import {profileApi} from '../features/profile/services/profileApi'
import { transactionApi } from "../features/transactions/services/transactionApi";
import { categoryApi } from '../features/categories/services/categoryApi'
import { budgetApi } from '../features/budgets/services/budgetApi'
import { analyticsApi } from '../features/analytics/services/analyticsApi'
import { goalApi } from '../features/goals/services/goalApi'
import { workspaceApi } from '../features/workspace/services/workspaceApi'
import { recurringApi } from '../features/recurring/services/recurringApi'

export const store = configureStore({
  reducer: {
    // The key must match authApi.reducerPath ('authApi'), otherwise the cache
    // lands under the wrong name and the generated hooks cannot find it.
    [authApi.reducerPath]: authApi.reducer,
    [profileApi.reducerPath]: profileApi.reducer,
    [transactionApi.reducerPath]: transactionApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [budgetApi.reducerPath]: budgetApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [goalApi.reducerPath]: goalApi.reducer,
    [workspaceApi.reducerPath]: workspaceApi.reducer,
    [recurringApi.reducerPath]: recurringApi.reducer,
  },

  // RTK Query ships as middleware. Without this line, caching, invalidation
  // and refetching silently stop working. Always add it.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      profileApi.middleware,
      transactionApi.middleware,
      categoryApi.middleware,
      budgetApi.middleware,
      analyticsApi.middleware,
      goalApi.middleware,
      workspaceApi.middleware,
      recurringApi.middleware
    ),
})

// These two types are derived FROM the store, so they can never drift out of
// sync when you add a reducer. Components use them for type safety.
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
