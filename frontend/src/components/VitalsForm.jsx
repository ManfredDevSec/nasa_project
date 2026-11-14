import { useEffect, useRef, useState } from 'react'
import { getErrorMessage, postDailyLog } from '../api/index.js'
import { buildDailyLogPayload } from '../utils/payloads.js'
import { CheckIcon, CloseIcon } from './Icons.jsx'
import StatusBadge from './StatusBadge.jsx'

const MOODS = ['Very low', 'Low', 'Okay', 'Good', 'Very good'] // saved as 1-5

// Number fields. min/max only catch typing mistakes; they are not health limits.
const NUMBER_FIELDS = [
  { field: 'resting_hr', label: 'Resting heart rate', unit: 'bpm', min: 20, max: 250, step: 1 },
  { field: 'bp_systolic', label: 'Blood pressure (top)', unit: 'mmHg', min: 50, max: 250, step: 1 },
  { field: 'bp_diastolic', label: 'Blood pressure (bottom)', unit: 'mmHg', min: 30, max: 150, step: 1 },
  { field: 'sleep_hours', label: 'Sleep last night', unit: 'hours', min: 0, max: 24, step: 0.1 },
  { field: 'sodium_mg', label: 'Sodium (salt) today', unit: 'mg', min: 0, max: 20000, step: 10 },
  { field: 'exercise_min', label: 'Exercise today', unit: 'minutes', min: 0, max: 600, step: 5 },
]
const EMPTY = { ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f.field, ''])), mood: null }

/**
 * "Log today's vitals" form in a native <dialog>, which gives Esc-to-close
 * and keeps keyboard focus inside while it is open.
 * After saving it shows the returned vitals_status and calls onSaved() so the body map refreshes.
 */
export default function VitalsForm({ open, onClose, onSaved, astronautId, date }) {
  const dialogRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [problems, setProblems] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(null)

  // Open / close the real dialog when the `open` prop changes.
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) {
      setForm(EMPTY)
      setProblems({})
      setError(null)
      setSaved(null)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  function validate() {
    const found = {}
    for (const { field, label, min, max } of NUMBER_FIELDS) {
      const value = Number(form[field])
      if (form[field] === '' || Number.isNaN(value)) found[field] = `Enter ${label.toLowerCase()}.`
      else if (value < min || value > max) found[field] = `Check this number (${min}-${max}).`
    }
    if (!form.mood) found.mood = 'Choose how you feel.'
    setProblems(found)
    return Object.keys(found).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setError(null)
    try {
      const fields = NUMBER_FIELDS.map((f) => f.field)
      const response = await postDailyLog(buildDailyLogPayload(form, fields, astronautId, date))
      setSaved(response)
      onSaved?.()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="vitals-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(46rem,calc(100%-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-0 text-white backdrop:bg-black/70"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h2 id="vitals-title" className="text-xl font-semibold">
          Log today's vitals
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-12 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>

      {saved ? (
        <div className="flex flex-col gap-4 p-6" role="status">
          <p className="flex items-center gap-2 text-lg">
            <CheckIcon className="size-6 text-sky-400" /> Saved for {saved.date ?? date}.
          </p>
          {saved.vitals_status?.length > 0 && (
            <ul className="flex flex-col gap-2">
              {saved.vitals_status.map((item, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3">
                  <StatusBadge level={item.level} size="sm" pulse={false} />
                  <span className="text-slate-200">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onClose} className="btn-primary self-end px-10">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {NUMBER_FIELDS.map(({ field, label, unit, min, max, step }) => (
              <div key={field} className="flex flex-col gap-1.5">
                <label htmlFor={`vital-${field}`} className="font-medium">
                  {label}
                </label>
                <input
                  id={`vital-${field}`}
                  type="number"
                  inputMode="decimal"
                  min={min}
                  max={max}
                  step={step}
                  value={form[field]}
                  onChange={(e) => update(field, e.target.value)}
                  aria-invalid={!!problems[field]}
                  aria-describedby={`vital-${field}-hint`}
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-lg aria-invalid:border-slate-300"
                />
                <span id={`vital-${field}-hint`} className={`text-sm ${problems[field] ? 'text-white' : 'text-slate-400'}`}>
                  {problems[field] ?? unit}
                </span>
              </div>
            ))}
          </div>

          <fieldset>
            <legend className="mb-2 font-medium">How do you feel today?</legend>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((word, i) => {
                const value = i + 1
                const active = form.mood === value
                return (
                  <button
                    key={word}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update('mood', value)}
                    className={`min-h-12 rounded-xl border px-1 text-sm transition-colors ${
                      active ? 'border-sky-400 bg-sky-400/15 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {word}
                  </button>
                )
              })}
            </div>
            {problems.mood && <p className="mt-1.5 text-sm text-white">{problems.mood}</p>}
          </fieldset>

          {error && (
            <p role="alert" className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200">
              Not saved: {getErrorMessage(error)}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary px-8">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}
