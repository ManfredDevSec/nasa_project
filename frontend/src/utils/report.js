// Helpers for GET /reports/weekly/. The report follows the API: object keys become labels and
// rows keep the API's own fields, so a new backend field still shows up without code changes.
// Known fields get a friendlier label and value below.

const WORDS = { co2: 'CO₂', mmhg: '(mmHg)', l: 'L', r: 'R', avg: 'average', '5day': '5-day', '7day': '7-day' }

// Plain-language labels for the fields the backend sends today.
const LABELS = {
  call_sign: 'Call sign',
  eyes: 'Eyes',
  tests: 'Tests this week',
  near_drift: 'Near vision drop (lines)',
  symptom_score: 'Symptom score',
  new_amsler: 'New grid changes',
  escalated: 'Sent to Earth',
  day_range: 'Mission days',
  co2_avg: 'CO₂ average (mmHg)',
  co2_max: 'CO₂ highest (mmHg)',
  days_above_normal: 'Days above normal',
  high_mark: 'High CO₂ mark (mmHg)',
  days_logged: 'Days logged',
}

// "co2_5day_avg_mmhg" -> "CO₂ 5-day average (mmHg)"
export function labelFor(key) {
  if (LABELS[key]) return LABELS[key]
  const text = key
    .split('_')
    .map((word) => WORDS[word] ?? word)
    .join(' ')
    .replace(' L R', ' L / R')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Internal ids and the all-parts "overall" (Sightline reports on the eyes only) are left out.
const HIDDEN_KEYS = new Set(['id', 'overall'])

// Table columns = the keys of the first row, in the order the API sends them.
export function tableColumns(rows) {
  return rows?.length ? Object.keys(rows[0]).filter((key) => !HIDDEN_KEYS.has(key)) : []
}

// [key, value] pairs of an object, for key/value grids.
export function fieldsOf(object) {
  return Object.entries(object ?? {}).filter(([key]) => !HIDDEN_KEYS.has(key))
}

// Lists may hold plain strings or { text } objects.
export function textOf(item) {
  return typeof item === 'string' ? item : item?.text
}

const EYE_NAMES = { LEFT: 'Left eye', RIGHT: 'Right eye', BOTH: 'Both eyes' }
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// "2026-11-09" -> "9 Nov 2026"
function readableDate(text) {
  const d = new Date(`${text}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Plain text for a value, or null when it should be shown as it is (status levels, booleans).
export function formatValue(key, value) {
  if (Array.isArray(value)) {
    if (key === 'day_range' && value.length === 2) return `${value[0]} to ${value[1]}`
    if (value.length === 0) return 'None'
    return value.map((v) => EYE_NAMES[v] ?? v).join(', ')
  }
  if (value && typeof value === 'object') {
    if ('left' in value || 'right' in value) return `Left ${value.left ?? '–'} · Right ${value.right ?? '–'}`
    return inlineObject(value)
  }
  if (typeof value === 'string' && DATE_ONLY.test(value)) return readableDate(value)
  return null
}

// One-line text for nested objects, e.g. { a: 1, b: 2 } -> "A: 1 · B: 2".
export function inlineObject(value) {
  return fieldsOf(value)
    .map(([k, v]) => `${labelFor(k)}: ${v}`)
    .join(' · ')
}
