import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { getMe } from '../api/index.js'
import { ROLE_LABELS, canSeeCrew, getToken, getUser, isAdmin, isAstronaut, saveSession } from '../utils/auth.js'
import { BookIcon, ChartIcon, HomeIcon, LockIcon, LogoMark, PrinterIcon, UsersIcon } from './Icons.jsx'
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
    // The eye test itself is started from Home (its one primary button), so it is not a nav item.
    items.push({ to: '/home', label: 'Home', Icon: HomeIcon })
    items.push({ to: `/trends/${user.astronaut_id}`, label: 'Trend', Icon: ChartIcon })
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

// "Cmdr. Ama Osei" -> "AO", "Specialist Efua Adjei" -> "EA" (titles and words ending in a dot are skipped).
const TITLES = new Set(['specialist', 'commander', 'captain', 'pilot', 'doctor', 'dr', 'cmdr'])
function initialsOf(name = '') {
  const all = name.split(/\s+/).filter(Boolean)
  const named = all.filter((w) => !w.endsWith('.') && !TITLES.has(w.toLowerCase()))
  const words = named.length ? named : all
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?'
}

export default function Layout() {
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

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <SpaceBackdrop />

      <header className="sticky top-0 z-30 px-3 pt-3 md:px-6 print:hidden">
        <div className="glass-pill mx-auto flex h-14 max-w-6xl items-center gap-4 pr-2 pl-4">
          <Link to="/" aria-label="Sightline home" className="flex shrink-0 items-center gap-2.5 rounded-full">
            <LogoMark className="h-7 w-auto" />
            <span className="font-display text-base font-semibold tracking-tight">Sightline</span>
          </Link>

          {/* Wide screens: text links in the middle; the current page sits in an inner pill */}
          <nav aria-label="Main" className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex min-h-10 items-center rounded-full px-4 text-[0.95rem] whitespace-nowrap transition-colors duration-200 ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            to="/account"
            aria-label={`Your account: ${name}, ${ROLE_LABELS[user.role] ?? user.role}`}
            title="Your account"
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-slate-800 text-sm font-semibold text-slate-100 transition-colors hover:border-white/25 lg:ml-0"
          >
            {initialsOf(name)}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-10 md:px-6">
        {/* Each screen eases in when you move between them */}
        <div key={location.pathname} className="animate-step-in">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-white/[0.06] pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-4 print:hidden">
        <Disclaimer />
      </footer>

      {/* Smaller screens: a floating tab bar, so the navigation never scrolls sideways */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden print:hidden">
        <ul
          className="glass-pill mx-auto grid max-w-md p-1"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-xs font-medium transition-colors duration-200 ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`
                }
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
