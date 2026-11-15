import { Link } from 'react-router-dom'
import { getErrorMessage, isForbidden } from '../api/index.js'
import { getUser, homePathFor } from '../utils/auth.js'
import { InfoIcon, LockIcon } from './Icons.jsx'

// Shared loading / error / empty views so every page handles all three the same way.

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-400">
      <span className="relative size-14" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-sky-400/25" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-300 [animation-duration:1.4s]" />
        <span className="absolute inset-[36%] animate-pulse-slow rounded-full bg-sky-300 shadow-[0_0_18px_rgb(127_184_164/0.9)]" />
      </span>
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Could not load this page' }) {
  // 403 = logged in, but this account may not see this data.
  if (isForbidden(error)) return <AccessDenied />
  return (
    <div role="alert" className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <InfoIcon className="size-10 text-slate-400" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-slate-400">{getErrorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary">
          Try again
        </button>
      )}
    </div>
  )
}

export function AccessDenied() {
  return (
    <div role="alert" className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <LockIcon className="size-10 text-slate-400" />
      <h2 className="text-xl font-semibold">You don't have access to this</h2>
      <p className="text-slate-400">Your account is not allowed to open this page. Ask an admin if you think this is wrong.</p>
      <Link to={homePathFor(getUser())} className="btn-primary">
        Go to my home page
      </Link>
    </div>
  )
}

export function EmptyState({ title, message, children }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-3xl border border-dashed border-sky-400/25 bg-slate-950/40 p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      {message && <p className="text-slate-400">{message}</p>}
      {children}
    </div>
  )
}
