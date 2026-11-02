// ============================================================================
// ProtectedRoute.tsx — the gate in front of every private page.
//
// How it works:
//   <Route element={<ProtectedRoute />}> wraps child routes. This component
//   asks the backend "who am I?" once. If the cookies are valid it renders
//   <Outlet />, which is the placeholder where the child page appears.
//   If the answer is 401, the visitor is sent to /login instead.
// ============================================================================

import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useGetMeQuery } from '../features/auth/services/authApi'

export default function ProtectedRoute() {
  // Remember the page the user wanted, so /login can send them back later.
  const location = useLocation()

  // getMe runs once and is cached by RTK Query. A 401 arrives as isError,
  // not as a thrown exception, so we check flags instead of try/catch.
  const { data, isLoading, isError } = useGetMeQuery()

  // First visit: the request is still in flight. Show a neutral message
  // instead of flashing the login page for a logged-in user.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    )
  }

  // Not logged in (or the answer was empty): redirect to the login screen.
  if (isError || !data) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Logged in: render whichever child route matched.
  return <Outlet />
}
