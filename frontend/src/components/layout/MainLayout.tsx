// ============================================================================
// MainLayout.tsx — the shell around every private page.
//
// Shape:
//   sidebar (left, fixed on desktop, slide-in on mobile)
//   navbar  (top: menu button, session line, user chip)
//   main    (where <Outlet /> drops the current page)
//
// It is used as a *layout route* in App.tsx, so it renders once and only the
// <Outlet /> part changes when you move between pages.
// ============================================================================

import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import {
  useGetMeQuery,
  useLogoutMutation,
} from '../../features/auth/services/authApi'

// One entry per page in the sidebar.
// `to` must match a <Route path="..."> in App.tsx, otherwise the catch-all
// route sends the user back to "/".
interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function MainLayout() {
  // Mobile: the sidebar is hidden until the menu button is pressed.
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigate = useNavigate()

  // The user is already cached by ProtectedRoute, so this does not refetch
  // and does not flicker.
  const { data } = useGetMeQuery()
  const user = data?.user

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()

  const handleLogout = async () => {
    try {
      await logout().unwrap()
    } catch {
      // The cookie may already be expired. Logging out locally is still correct.
    }
    // replace: true keeps /dashboard out of the back-button history.
    navigate('/login', { replace: true })
  }

  // Initials for the avatar circle: "Suman Jhanp" -> "SJ".
  const initials =
    user?.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ?? '?'

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Dark backdrop on mobile, tap to close */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
        />
      )}

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand + mobile close button */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <span className="text-base font-semibold">SpendWise</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout at the bottom of the sidebar */}
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60"
          >
            <LogOut className="size-4 shrink-0" />
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ---------------- RIGHT SIDE ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Navbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <span className="text-sm text-muted-foreground">
            {user ? `Signed in as ${user.email}` : ''}
          </span>

          <div className="ml-auto flex items-center gap-3">
            {/* Avatar with initials */}
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{user?.name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.currency}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
