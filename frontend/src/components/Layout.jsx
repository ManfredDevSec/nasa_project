import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getMe, logout } from '../api/index.js'
import { ROLE_LABELS, canSeeCrew, clearSession, getToken, getUser, isAdmin, isAstronaut, saveSession } from '../utils/auth.js'
import { BookIcon, ChartIcon, EyeIcon, HomeIcon, LockIcon, LogoMark, LogoutIcon, PrinterIcon, UsersIcon } from './Icons.jsx'
import SpaceBackdrop from './SpaceBackdrop.jsx'

export function Disclaimer() {
  return <p className="text-center text-sm text-slate-400">
      Prototype, not a medical device. Simulated data. <span className="text-slate-500">Space image: NASA/ESA Hubble.</span>
    </p>
}

// Which links each user sees in the navigation.
function navItemsFor(user) {
  const items = []
  if (isAstronaut(user)) {
    items.push({ to: '/home', label: 'Home', Icon: HomeIcon })
    items.push({ to: '/test', label: 'Eye test', Icon: EyeIcon })
    items.push({ to: `/trends/${user.astronaut_id}`, label: 'My trend', Icon: ChartIcon })
  }
  // Crew dashboard and report links are hidden from CREW accounts.
  if (canSeeCrew(user)) {
    items.push({ to: '/crew', label: 'Crew', Icon: UsersIcon })
    items.push({ to: '/report', label: 'Report', Icon: PrinterIcon })
  }
  // Account management is for admins only.
  if (isAdmin(user)) items.push({ to: '/admin/users', label: 'Users', Icon: LockIcon })
  items.push({ to: '/learn', label: 'Learn', Icon: BookIcon })
  return items
}

// "Cmdr. Ama Osei" -> "AO", "Dr. Yaw Boateng" -> "YB" (titles ending in a dot are skipped).
function initialsOf(name = '') {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith('.'))
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?'
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(getUser)

  // Refresh the saved user from GET /auth/me/ when the app opens, so a name or role change
  // made by an admin shows up. A dead token is handled by the 401 logout in the API client.
  useEffect(() => {
    let active = true
    getMe()
      .then((fresh) => {
        if (!active || !fresh) return
        saveSession(getToken(), fresh)
        setUser(fresh)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const items = navItemsFor(user)
  const name = user.display_name ?? user.username
  const [loggingOut, setLoggingOut] = useState(false)

  // Tell the server first, then forget the token locally even if the server call fails.
  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // The token is cleared below either way.
    } finally {
      clearSession()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <SpaceBackdrop />

      <header className="sticky top-0 z-30 px-3 pt-3 md:px-6 print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 rounded-2xl border border-white/[0.08] bg-slate-900/65 px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_18px_50px_-24px_rgb(109_59_232/0.7)] backdrop-blur-xl md:px-5">
          <Link
            to="/"
            aria-label="Sightline home"
            className="flex shrink-0 items-center gap-2.5 rounded-xl transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <LogoMark className="h-8 w-auto" />
            <span className="font-display text-lg font-semibold tracking-tight">Sightline</span>
          </Link>

          {/* Wide screens: a centred pill navigation */}
          <nav aria-label="Main" className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map(({ to, label, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    title={label}
                    className={({ isActive }) =>
                      `group relative flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.95rem] whitespace-nowrap transition-transform duration-300 ease-[var(--ease-spring)] active:scale-[0.96] ${
                        isActive ? 'text-white' : 'text-slate-300'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active pill and hover wash fade by opacity only */}
                        <span
                          aria-hidden="true"
                          className={`absolute inset-0 rounded-full bg-sky-400/15 ring-1 ring-sky-400/35 transition-opacity duration-300 ${
                            isActive ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute inset-0 rounded-full bg-white/[0.06] opacity-0 transition-opacity duration-300 ${
                            isActive ? '' : 'group-hover:opacity-100'
                          }`}
                        />
                        <Icon className={`relative size-[18px] shrink-0 ${isActive ? 'text-sky-300' : ''}`} />
                        {/* not-sr-only resets white-space to normal, so keep labels on one line explicitly */}
                        <span className="relative sr-only xl:not-sr-only xl:whitespace-nowrap">{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <Link
              to="/account"
              aria-label={`Your account: ${name}, ${ROLE_LABELS[user.role] ?? user.role}`}
              title="Your account"
              className="flex items-center gap-3 rounded-full transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.96]"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-sky-300 to-sky-600 font-mono text-sm font-semibold text-slate-950 shadow-[0_0_0_3px_rgb(11_6_24),0_0_0_4px_rgb(167_139_250/0.35)]"
              >
                {initialsOf(name)}
              </span>
              <span className="hidden">
                <span className="block text-sm font-medium">{name}</span>
                <span className="block text-xs text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label={loggingOut ? 'Logging out' : 'Log out'}
              className="group relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/[0.08] px-3 text-slate-300 transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.96] disabled:opacity-50"
            >
              <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <LogoutIcon className="relative size-5" />
              <span className="relative hidden whitespace-nowrap sm:inline lg:hidden">{loggingOut ? 'Logging out…' : 'Log out'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-10 md:px-6">
        {/* Each screen eases in when you move between them */}
        <div key={location.pathname} className="animate-step-in">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/[0.06] pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-4 print:hidden">
        <Disclaimer />
      </footer>

      {/* Smaller screens: a bottom tab bar, so the navigation never scrolls sideways */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-slate-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-3xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                title={label}
                className={({ isActive }) =>
                  `relative flex min-h-[68px] flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-transform duration-300 ease-[var(--ease-spring)] active:scale-[0.94] ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`absolute top-0 h-0.5 w-10 rounded-full bg-sky-400 shadow-[0_0_12px_rgb(167_139_250/0.9)] transition-[transform,opacity] duration-300 ${
                        isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                      }`}
                    />
                    <Icon className={`size-6 ${isActive ? 'text-sky-300' : ''}`} />
                    <span className="max-w-full truncate">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
