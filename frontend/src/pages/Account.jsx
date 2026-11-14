import { useState } from 'react'
import { changePassword, getErrorMessage, updateMe } from '../api/index.js'
import { Field, Notice, PASSWORD_HINT } from '../components/AuthBits.jsx'
import { ROLE_LABELS, getToken, getUser, saveSession } from '../utils/auth.js'

/** Your account: profile (PATCH /auth/me/) and password change (POST /auth/password/change/). */
export default function Account() {
  const [user, setUser] = useState(getUser)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Your account</p>
        <h1 className="display-title text-4xl md:text-5xl">{user.display_name ?? user.username}</h1>
        <p className="text-slate-400">
          Signed in as <span className="font-mono text-white">{user.username}</span> · {ROLE_LABELS[user.role] ?? user.role}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm user={user} onSaved={setUser} />
        <PasswordForm user={user} />
      </div>
    </div>
  )
}

function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setSaved(false)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const fresh = await updateMe(form)
      saveSession(getToken(), fresh)
      onSaved(fresh)
      setSaved(true)
    } catch (err) {
      setErrors({
        first_name: err.field?.('first_name'),
        last_name: err.field?.('last_name'),
        email: err.field?.('email'),
        general: Object.keys(err.details ?? {}).length ? null : getErrorMessage(err),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card flex flex-col gap-5 p-6" aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-2xl font-semibold">
        Profile
      </h2>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first-name" label="First name" autoComplete="given-name" value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
          <Field id="last-name" label="Last name" autoComplete="family-name" value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
        </div>
        <Field
          id="profile-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          hint="Used for password reset links."
        />
        <Notice>{errors.general}</Notice>
        {saved && <Notice tone="ok">Profile saved.</Notice>}
        <button type="submit" disabled={busy} className="btn-primary self-start">
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </section>
  )
}

function PasswordForm({ user }) {
  const empty = { old: '', next: '', confirm: '' }
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setDone(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (form.next !== form.confirm) {
      setErrors({ confirm: 'The two new passwords do not match.' })
      return
    }
    setBusy(true)
    setErrors({})
    try {
      const { token } = await changePassword(form.old, form.next)
      // The old token is dead now: keep using the new one.
      saveSession(token, getUser() ?? user)
      setForm(empty)
      setDone(true)
    } catch (err) {
      setErrors({
        old: err.field?.('old_password'),
        next: err.field?.('new_password'),
        general: err.field?.('old_password') || err.field?.('new_password') ? null : getErrorMessage(err),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card flex flex-col gap-5 p-6" aria-labelledby="password-title">
      <h2 id="password-title" className="text-2xl font-semibold">
        Change password
      </h2>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="old-password" label="Current password" type="password" autoComplete="current-password" value={form.old} onChange={set('old')} error={errors.old} />
        <Field
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.next}
          onChange={set('next')}
          error={errors.next}
          hint={PASSWORD_HINT}
        />
        <Field id="confirm-new-password" label="Type the new password again" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Notice>{errors.general}</Notice>
        {done && <Notice tone="ok">Password changed. You stay signed in here; other devices are signed out.</Notice>}
        <button type="submit" disabled={busy || !form.old || !form.next} className="btn-primary self-start">
          {busy ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
