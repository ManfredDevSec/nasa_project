import { Link } from 'react-router-dom'
import { LogoMark } from './Icons.jsx'
import { Disclaimer } from './Layout.jsx'
import SpaceBackdrop from './SpaceBackdrop.jsx'

/** Page frame for the signed-out screens (forgot / reset password): logo, one card, disclaimer. */
export function AuthShell({ title, children }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <SpaceBackdrop />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-10">
        <Link
          to="/"
          aria-label="Sightline home"
          className="flex items-center gap-3 self-start rounded-xl transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <LogoMark className="h-10 w-auto" />
          <span className="text-2xl font-semibold tracking-tight">Sightline</span>
        </Link>
        <section className="card flex animate-step-in flex-col gap-5 p-8" aria-labelledby="auth-title">
          <h1 id="auth-title" className="display-title text-4xl">
            {title}
          </h1>
          {children}
        </section>
      </main>
      <footer className="border-t border-white/[0.06] py-3">
        <Disclaimer />
      </footer>
    </div>
  )
}

/** One labelled input with its field error underneath (errors come from ApiError.field()). */
export function Field({ id, label, error, hint, className = '', ...inputProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-12 rounded-xl border bg-slate-950/70 px-4 shadow-[inset_0_1px_2px_rgb(3_5_18/0.6)] placeholder:text-slate-500 ${
          error ? 'border-status-red/70' : 'border-slate-700'
        }`}
        {...inputProps}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

// The server's password rules, shown as a hint (the server checks them too).
export const PASSWORD_HINT = 'At least 8 characters, not a common password, not only numbers, and not close to your name or email.'

/** A general message box: role="alert" for problems, role="status" for good news. */
export function Notice({ tone = 'error', children }) {
  if (!children) return null
  const styles = tone === 'error' ? 'border-red-400/30 bg-red-400/10 text-red-100' : 'border-sky-400/30 bg-sky-400/10 text-sky-100'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 ${styles}`}>
      {children}
    </p>
  )
}
