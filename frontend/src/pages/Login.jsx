import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getErrorMessage, login } from '../api/index.js'
import { LogoMark } from '../components/Icons.jsx'
import { Disclaimer } from '../components/Layout.jsx'
import SpaceBackdrop from '../components/SpaceBackdrop.jsx'
import { getToken, getUser, homePathFor, saveSession } from '../utils/auth.js'

// Notices the app sends people here with (see the API notes, sections 3 and 5).
const NOTICES = {
  expired: 'Your session expired. Please log in again.',
  reset: 'Password set. Please log in.',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const notice = params.get('expired') ? NOTICES.expired : params.get('reset') ? NOTICES.reset : null
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null) // which button is waiting: 'form' or a username
  const [error, setError] = useState(null)

  // Already logged in? Skip this page.
  if (getToken() && getUser()) return <Navigate to={homePathFor(getUser())} replace />

  async function signIn(name, pass, source) {
    setBusy(source)
    setError(null)
    try {
      const { token, user } = await login(name, pass)
      saveSession(token, user)
      // Go back to the page the user first asked for, if their role allows it; otherwise their home.
      const home = homePathFor(user)
      const from = location.state?.from
      navigate(from && from !== '/login' ? from : home, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(null)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    signIn(username.trim(), password, 'form')
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <SpaceBackdrop />
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 md:grid-cols-2">
        {/* Brand panel */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
              aria-label="Sightline home"
            >
              <LogoMark className="h-11 w-auto" />
              <span className="font-display text-3xl font-semibold tracking-tight">Sightline</span>
            </Link>
          </div>
          <h1 className="display-title max-w-md text-4xl">
            A short weekly eye check, compared with your own baseline.
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            Each result is shown as all clear, watch or act now, with plain reasons and next steps for the crew and
            the flight surgeon.
          </p>
          <Horizon />
        </section>

        {/* Sign-in panel */}
        <section className="card flex flex-col gap-6 p-8" aria-labelledby="login-title">
          <h2 id="login-title" className="text-2xl font-semibold">
            Sign in
          </h2>
          {notice && !error && (
            <p role="status" className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-sky-100">
              {notice}
            </p>
          )}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="font-medium">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 shadow-[inset_0_1px_2px_rgb(4_6_5/0.6)] placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="password" className="font-medium">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="rounded text-sm text-sky-400 underline-offset-4 hover:text-sky-300 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 shadow-[inset_0_1px_2px_rgb(4_6_5/0.6)] placeholder:text-slate-500"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100">
                {error}
              </p>
            )}
            <button type="submit" disabled={!!busy} className="btn-primary">
              {busy === 'form' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
      <footer className="border-t border-slate-800 py-3">
        <Disclaimer />
      </footer>
    </div>
  )
}

// Decorative planet horizon with a faint orbit line.
function Horizon() {
  return (
    <svg viewBox="0 0 480 120" className="w-full max-w-md" aria-hidden="true">
      <defs>
        <linearGradient id="limb" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7fb8a4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7fb8a4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="240" cy="190" rx="300" ry="110" fill="url(#limb)" />
      <ellipse cx="240" cy="192" rx="300" ry="110" fill="#0e100f" />
      <path d="M10 60 Q240 -10 470 60" fill="none" stroke="#353c38" strokeDasharray="3 6" />
      <circle cx="352" cy="27" r="4" fill="#f5f7f6" />
    </svg>
  )
}
