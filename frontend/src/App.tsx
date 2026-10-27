// import: pulls React Router functions/variables into this file.
// BrowserRouter = "the app watches the URL bar". Link = navigation without reload.
// Routes/Route = the routing table. Navigate = redirect the user somewhere.
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'

// Our real login screen lives in its own file. Import it so the router can use it.
import LoginPage from './pages/LoginPage'

// A component is just a function that returns JSX (the UI).
// Home is our landing page component.
function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">SpendWise</h1>
      <p className="text-muted-foreground">Welcome to your finance dashboard</p>
      {/* Link is like an <a> tag, but it changes the URL WITHOUT reloading the page */}
      <Link to="/dashboard" className="text-primary underline">
        Go to Dashboard
      </Link>
    </main>
  )
}

// Dashboard page component. Later this will hold the real cards and charts.
function Dashboard() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Your Income, Expense and Savings cards will live here.
      </p>
    </main>
  )
}

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
        {/* When the URL is "/dashboard", render <Dashboard /> */}
        <Route path="/dashboard" element={<Dashboard />} />
        {/* When the URL is "/login", render the real <LoginPage /> component */}
        <Route path="/login" element={<LoginPage />} />
        {/* "*" catches ANY url not listed above, then Navigate redirects (replace) to "/" */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// export default makes App available to other files, e.g. `import App from './App.tsx'`
export default App