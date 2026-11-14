import { useEffect, useState } from 'react'
import { createUser, deactivateUser, getErrorMessage, listUsers, updateUser } from '../api/index.js'
import { Field, Notice, PASSWORD_HINT } from '../components/AuthBits.jsx'
import { CloseIcon, PlusIcon } from '../components/Icons.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import { ROLE_LABELS, getUser } from '../utils/auth.js'
import { useApi } from '../utils/useApi.js'

/**
 * Admin: user management (GET/POST/PATCH/DELETE /auth/users/). ADMIN only; the backend
 * answers 403 for anyone else. "Deactivate" never deletes: it switches is_active off.
 */
const ROLES = ['CREW', 'MEDICAL_OFFICER', 'FLIGHT_SURGEON', 'ADMIN']
const NEEDS_ASTRONAUT = ['CREW', 'MEDICAL_OFFICER']

const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'

export default function AdminUsers() {
  const me = getUser()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('') // search, applied after a short pause in typing
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('true') // 'true' active, 'false' deactivated, '' all
  const [editing, setEditing] = useState(null) // null, 'new', or a user object
  const [message, setMessage] = useState(null)
  const [rowError, setRowError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: users, loading, error, reload } = useApi(
    () => listUsers({ role, is_active: status, search: query }),
    [role, status, query],
  )

  function saved(user, wasNew) {
    setEditing(null)
    setMessage(
      wasNew
        ? `${user.display_name || user.username} was added.${user._passwordSet ? '' : ' An invite email is on its way so they can choose a password.'}`
        : `${user.display_name || user.username} was updated.`,
    )
    reload()
  }

  async function toggleActive(user) {
    setRowError(null)
    setMessage(null)
    try {
      if (user.is_active) await deactivateUser(user.id)
      else await updateUser(user.id, { is_active: true })
      setMessage(`${user.display_name || user.username} was ${user.is_active ? 'deactivated' : 'reactivated'}.`)
      reload()
    } catch (err) {
      setRowError(getErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Admin</p>
          <h1 className="display-title text-4xl md:text-5xl">Users</h1>
          <p className="text-slate-400">Add people, set their role and link crew accounts to an astronaut.</p>
        </div>
        {editing === null && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing('new')
              setMessage(null)
            }}
          >
            <PlusIcon className="size-5" /> Add user
          </button>
        )}
      </div>

      {editing !== null && (
        <UserForm key={editing === 'new' ? 'new' : editing.id} user={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSaved={saved} />
      )}

      <Notice tone="ok">{message}</Notice>
      <Notice>{rowError}</Notice>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-4 rounded-2xl p-4">
        <Field
          id="user-search"
          label="Search"
          type="search"
          placeholder="Name, username or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Select id="role-filter" label="Role" value={role} onChange={setRole}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select id="status-filter" label="Status" value={status} onChange={setStatus}>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
          <option value="">All</option>
        </Select>
      </div>

      {loading && <LoadingState label="Loading users…" />}
      {error && <ErrorState error={error} onRetry={reload} title="Could not load users" />}
      {!loading && !error && users?.length === 0 && <EmptyState title="No users match" message="Try another search or filter." />}

      {!loading && !error && users?.length > 0 && (
        <ul className="card divide-y divide-white/[0.06] overflow-hidden" aria-label="Users">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">
                  {u.display_name || u.username}
                  {u.id === me?.id && <span className="ml-2 text-sm text-slate-400">(you)</span>}
                </p>
                <p className="text-sm text-slate-400">
                  <span className="font-mono">{u.username}</span>
                  {u.email && <> · {u.email}</>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-sky-200">{ROLE_LABELS[u.role] ?? u.role}</span>
                {u.astronaut_id != null && (
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-slate-300">Astronaut #{u.astronaut_id}</span>
                )}
                {!u.is_active && <span className="rounded-full border border-status-amber/50 px-2.5 py-0.5 text-amber-200">Deactivated</span>}
              </div>
              <p className="w-36 text-sm text-slate-400">
                Last sign-in
                <br />
                <span className="text-slate-200">{shortDate(u.last_login)}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary min-h-11 px-4 text-sm"
                  onClick={() => {
                    setEditing(u)
                    setMessage(null)
                  }}
                  aria-label={`Edit ${u.display_name || u.username}`}
                >
                  Edit
                </button>
                {u.id !== me?.id && (
                  <button
                    type="button"
                    className="btn-secondary min-h-11 px-4 text-sm"
                    onClick={() => toggleActive(u)}
                    aria-label={`${u.is_active ? 'Deactivate' : 'Reactivate'} ${u.display_name || u.username}`}
                  >
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Select({ id, label, value, onChange, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`min-h-12 rounded-xl border bg-slate-950/70 px-3 ${error ? 'border-status-red/70' : 'border-slate-700'}`}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

/** Create (user = null) or edit a user. Field errors come straight from the API's details. */
function UserForm({ user, onCancel, onSaved }) {
  const isNew = !user
  const [form, setForm] = useState({
    username: user?.username ?? '',
    role: user?.role ?? 'CREW',
    astronaut_id: user?.astronaut_id ?? '',
    email: user?.email ?? '',
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const needsAstronaut = NEEDS_ASTRONAUT.includes(form.role)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    const payload = {
      role: form.role,
      astronaut_id: needsAstronaut && form.astronaut_id !== '' ? Number(form.astronaut_id) : null,
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
    }
    if (isNew) payload.username = form.username.trim()
    if (form.password) payload.password = form.password
    try {
      const result = isNew ? await createUser(payload) : await updateUser(user.id, payload)
      onSaved({ ...result, _passwordSet: Boolean(form.password) }, isNew)
    } catch (err) {
      const d = err.details ?? {}
      setErrors({
        username: err.field?.('username'),
        role: err.field?.('role'),
        astronaut_id: err.field?.('astronaut_id'),
        email: err.field?.('email'),
        first_name: err.field?.('first_name'),
        last_name: err.field?.('last_name'),
        password: err.field?.('password'),
        general: err.field?.('non_field_errors') ?? (Object.keys(d).length ? null : getErrorMessage(err)),
      })
      setBusy(false)
    }
  }

  return (
    <section className="card animate-step-in flex flex-col gap-5 p-6" aria-labelledby="user-form-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="user-form-title" className="text-2xl font-semibold">
          {isNew ? 'Add a user' : `Edit ${user.display_name || user.username}`}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-full text-slate-400 transition-transform duration-300 hover:scale-105 hover:text-white active:scale-95"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
        {isNew ? (
          <Field id="new-username" label="Username" autoComplete="off" value={form.username} onChange={(e) => set('username')(e.target.value)} error={errors.username} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="font-medium">Username</span>
            <span className="flex min-h-12 items-center font-mono text-slate-300">{user.username}</span>
          </div>
        )}
        <Select id="new-role" label="Role" value={form.role} onChange={set('role')} error={errors.role}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        {needsAstronaut ? (
          <Field
            id="new-astronaut"
            label="Astronaut ID"
            type="number"
            min="1"
            inputMode="numeric"
            value={form.astronaut_id}
            onChange={(e) => set('astronaut_id')(e.target.value)}
            error={errors.astronaut_id}
            hint="Crew and medical officer accounts link to one astronaut."
          />
        ) : (
          <div className="flex flex-col justify-center rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">
            {ROLE_LABELS[form.role]} accounts are not linked to an astronaut.
            {errors.astronaut_id && <span className="mt-1 text-red-300">{errors.astronaut_id}</span>}
          </div>
        )}
        <Field id="new-email" label="Email" type="email" autoComplete="off" value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
        <Field id="new-first" label="First name" value={form.first_name} onChange={(e) => set('first_name')(e.target.value)} error={errors.first_name} />
        <Field id="new-last" label="Last name" value={form.last_name} onChange={(e) => set('last_name')(e.target.value)} error={errors.last_name} />
        <Field
          id="new-password"
          label={isNew ? 'Password (optional)' : 'New password (optional)'}
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set('password')(e.target.value)}
          error={errors.password}
          hint={isNew ? `Leave empty to email them an invite to choose their own. ${PASSWORD_HINT}` : 'Leave empty to keep their current password.'}
          className="md:col-span-2"
        />
        <div className="md:col-span-2">
          <Notice>{errors.general}</Notice>
        </div>
        <div className="flex gap-3 md:col-span-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : isNew ? 'Add user' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
