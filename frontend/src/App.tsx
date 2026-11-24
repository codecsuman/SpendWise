import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { ThemeToggle } from './components/ThemeControls'
import PageLoader from './components/PageLoader'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'

// Pages are split into their own chunks. The browser downloads a page only
// when the user opens it, so the first load stays small on slow devices.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const RecurringPage = lazy(() => import('./pages/RecurringPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function Home() {
  return (
    <main className="page-container flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="page-title">SpendWise</h1>
      <p className="page-description">Welcome to your finance dashboard</p>
      <Link to="/dashboard" className="button-primary">
        Go to Dashboard
      </Link>
    </main>
  )
}

function PublicLayout() {
  const { pathname } = useLocation()

  return (
    <div
      className="page-wrap page-theme flex min-h-dvh flex-col"
      data-page={pathname.split('/')[1] || 'home'}
    >
      <header className="flex justify-end px-4 pt-4 md:px-7">
        <ThemeToggle />
      </header>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Everything inside this route requires a valid session cookie.
            ProtectedRoute must stay outside MainLayout: a guest must never
            see the app shell before the redirect. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/workspace/:noteId" element={<WorkspacePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
