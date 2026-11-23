// ============================================================================
// MainLayout.tsx — the shell around every private page.
//
// Shape:
//   sidebar (left, fixed on desktop, slide-in on mobile)
//   navbar  (top: menu button, session line, user chip)
//   main    (where <Outlet /> renders the current page)
//
// It is used as a *layout route* in App.tsx, so it renders once and only the
// <Outlet /> part changes when you move between pages.
// ============================================================================

import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  Settings,
  StickyNote,
  Tags,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import {
  useGetMeQuery,
  useLogoutMutation,
} from '../../features/auth/services/authApi'
import GlobalQuickActions from './GlobalQuickActions'
import NotificationBell from '../feedback/NotificationBell'
import PageLoader from '../PageLoader'
import { ThemeToggle } from '../ThemeControls'

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
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/workspace', label: 'Workspace', icon: StickyNote },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function MainLayout() {
  // Mobile: the sidebar is hidden until the menu button is pressed.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop: collapse the sidebar to an icon rail to give the page more room.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const navigate = useNavigate()
  const { pathname } = useLocation()
  const page = pathname.split('/')[1]

  // While the drawer is open, Escape closes it and the page behind it cannot
  // scroll. Both keep small touch screens from getting stuck.
  useEffect(() => {
    if (!sidebarOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 64rem)')
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setSidebarOpen(false)
    }
    desktop.addEventListener('change', onDesktop)
    const menuButton = menuButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      // Closing the drawer returns keyboard focus to the button that opened it.
      desktop.removeEventListener('change', onDesktop)
      if (!desktop.matches) menuButton?.focus()
    }
  }, [sidebarOpen])

  // Each page starts at the top. Without this the browser keeps the old scroll
  // position, so a new page can open halfway down (or clamped to the bottom).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

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
    <div className="page-wrap page-theme flex min-h-dvh" data-page={page}>
      {/* Dark backdrop on mobile, tap to close */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 theme-scrim lg:hidden"
        />
      )}

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 max-w-[85vw] shrink-0 flex-col overscroll-contain border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,visibility,transform,background-color,border-color,color] duration-200 motion-reduce:transition-none lg:visible lg:sticky lg:top-0 lg:h-dvh lg:min-w-0 lg:max-w-none lg:self-start lg:translate-x-0 lg:shadow-(--sidebar-shadow) ${
          sidebarOpen ? 'visible translate-x-0 shadow-(--sidebar-shadow)' : 'invisible -translate-x-full'
        } ${
          sidebarCollapsed ? 'lg:w-[72px]' : ''
        }`}
      >
        {/* Brand + sidebar controls */}
        <div
          className={`flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5${
            sidebarCollapsed ? ' lg:justify-center lg:px-0' : ''
          }`}
        >
          <div className={sidebarCollapsed ? 'flex items-center gap-2 lg:hidden' : 'flex items-center gap-2'}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <span className="text-base font-semibold">
              SpendWise
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            aria-controls="app-sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden size-9 shrink-0 place-items-center rounded-lg border border-sidebar-border hover:border-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring active:bg-sidebar-accent motion-reduce:transition-none lg:grid"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav
          aria-label="Main navigation"
          className={`flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3${
            sidebarCollapsed ? ' nav-rail' : ''
          }`}
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={sidebarCollapsed ? label : undefined}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `nav-link text-sm ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="nav-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout at the bottom of the sidebar */}
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label={isLoggingOut ? 'Signing out?' : 'Sign out'}
            title={sidebarCollapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60${
              sidebarCollapsed ? ' lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : undefined}>
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </div>
      </aside>

      {/* ---------------- RIGHT SIDE ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Navbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-7">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {user ? `Signed in as ${user.email}` : ''}
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ThemeToggle />
            {user && <NotificationBell key={user.id} userId={user.id} />}
            {/* Avatar with initials */}
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
              ) : initials}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{user?.name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.currency}</p>
            </div>
          </div>
        </header>

        <main className="page-container flex-1">
          {/* Pages load on demand; the shell stays visible while a chunk downloads. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Quick Note + Calculator are available on every authenticated page. */}
      <GlobalQuickActions />
    </div>
  )
}
