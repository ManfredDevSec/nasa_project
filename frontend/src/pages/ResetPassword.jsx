import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset, getErrorMessage } from '../api/index.js'
import { AuthShell, Field, Notice, PASSWORD_HINT } from '../components/AuthBits.jsx'

/**
 * Step 2: the emailed link opens /reset-password?uid=...&token=...
 * The same page is used for new-account invites, so the wording stays neutral.
 * Links work once and expire after one hour.
 */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const uid = params.get('uid')
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(!uid || !token)
  const [errors, setErrors] = useState({})

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setErrors({ confirm: 'The two passwords do not match.' })
      return
    }
    setBusy(true)
    setErrors({})
    try {
      await confirmPasswordReset(uid, token, password)
      navigate('/login?reset=1', { replace: true })
    } catch (err) {
      if (err.field?.('token') || err.field?.('uid')) setExpired(true)
      else setErrors({ password: err.field?.('new_password'), general: err.field?.('new_password') ? null : getErrorMessage(err) })
      setBusy(false)
    }
  }

  if (expired) {
    return (
      <AuthShell title="This link has expired">
        <p className="text-slate-300">Reset links work once and expire after one hour.</p>
        <Link to="/forgot-password" className="btn-primary self-start">
          Send a new link
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={PASSWORD_HINT}
        />
        <Field
          id="confirm-password"
          label="Type it again"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Notice>{errors.general}</Notice>
        <button type="submit" disabled={busy || !password} className="btn-primary">
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthShell>
  )
}
