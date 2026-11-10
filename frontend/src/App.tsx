// import: pulls React Router functions/variables into this file.
// BrowserRouter = "the app watches the URL bar". Link = navigation without reload.
// Routes/Route = the routing table. Navigate = redirect the user somewhere.
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'

// Our real login screen lives in its own file. Import it so the router can use it.
import LoginPage from './pages/LoginPage'

// The sign-up screen lives in its own file too.
import RegisterPage from './pages/RegisterPage'

// The gate that checks the session cookie before showing private pages.
import ProtectedRoute from './routes/ProtectedRoute'

// The shell (sidebar + navbar) around every private page.
import MainLayout from './components/layout/MainLayout'

// The profile screen: edit account details and change the password.
import ProfilePage from './pages/ProfilePage'

// Money in and out: list, filter and delete transactions.
import TransactionsPage from './pages/TransactionsPage'

// Manage the labels transactions are filed under.
import CategoriesPage from './pages/CategoriesPage'

// Monthly spending limits per category.
import BudgetsPage from './pages/BudgetsPage'

// Savings goals: target amount, saved amount and a target date.
import GoalsPage from './pages/GoalsPage'

// The first screen after login: totals, trend and category split.
import DashboardPage from './pages/DashboardPage'

// Deeper view: category donut + multi-month income/expense trend.
import AnalyticsPage from './pages/AnalyticsPage'

// Notes, folders, linked records and a calculator.
import WorkspacePage from './pages/WorkspacePage'

// Bills and income that repeat on a schedule.
import RecurringPage from './pages/RecurringPage'

// A component is just a function that returns JSX (the UI).
// Home is our landing page component.
function Home() {
  return (
    <main className="page-wrap aurora fx page-analytics flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">SpendWise</h1>
      <p className="text-muted-foreground">Welcome to your finance dashboard</p>
      {/* Link is like an <a> tag, but it changes the URL WITHOUT reloading the page */}
      <Link to="/dashboard" className="text-primary underline">
        Go to Dashboard
      </Link>
    </main>
  )
}

// Dashboard page component. The shell (MainLayout) already supplies the
// page-dashboard theme and background, so the page only supplies the content.

// The login page now lives in ./pages/LoginPage.tsx and is imported above.

// App is the ROOT component. main.tsx renders <App /> into the HTML page,
// so everything in the whole application lives inside this component tree.
function App() {
  return (
    // BrowserRouter gives the app "URL awareness": it watches the address bar
    // and tells <Routes /> which URL the user is currently on.
    <BrowserRouter>
      {/* Routes = the full list of URL patterns (the routing table) */}
      <Routes>
        {/* When the URL is exactly "/", render the <Home /> component */}
        <Route path="/" element={<Home />} />
        {/* When the URL is "/login", render the real <LoginPage /> component */}
        <Route path="/login" element={<LoginPage />} />
        {/* When the URL is "/register", render the real <RegisterPage /> component */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Everything inside this <Route> requires a valid session cookie.
            ProtectedRoute renders <Outlet />, which is where the child lands. */}
        <Route element={<ProtectedRoute />}>
          {/* Logged in -> wrap the page in the app shell (sidebar + navbar).
              Keep ProtectedRoute outside: a guest must never see the shell. */}
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
          </Route>
        </Route>

        {/* "*" catches ANY url not listed above, then Navigate redirects (replace) to "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// export default makes App available to other files, e.g. `import App from './App.tsx'`
export default App