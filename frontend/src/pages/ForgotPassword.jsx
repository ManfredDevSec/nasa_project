import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage, requestPasswordReset } from '../api/index.js'
import { AuthShell, Field, Notice } from '../components/AuthBits.jsx'

/**
 * Step 1 of "forgot password": ask for the email. The server always answers the same way,
 * whether or not an account uses that email, so nobody can probe which emails exist.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null) // the server's "detail" text once sent
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setFieldError('Enter the email address on your account.')
      return
    }
    setBusy(true)
    setError(null)
    setFieldError(null)
    try {
      const res = await requestPasswordReset(email.trim())
      setSent(res?.detail ?? 'If an account uses that email, we sent a link to reset the password.')
    } catch (err) {
      setFieldError(err.field?.('email') ?? null)
      if (!err.field?.('email')) setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Forgot your password?">
      {sent ? (
        <>
          <Notice tone="ok">{sent}</Notice>
          <p className="text-slate-400">The link works once and expires after one hour.</p>
          <Link to="/login" className="btn-secondary self-start">
            Back to sign in
          </Link>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p className="text-slate-400">Enter the email on your account and we'll send you a link to choose a new password.</p>
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError}
          />
          <Notice>{error}</Notice>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <Link to="/login" className="self-start rounded text-sm text-sky-400 underline-offset-4 hover:text-sky-300 hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
