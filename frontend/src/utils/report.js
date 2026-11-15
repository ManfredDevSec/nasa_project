// Helpers for GET /reports/weekly/. The report is shown exactly as returned:
// object keys become labels, and rows keep the API's own fields.

const WORDS = { co2: 'CO₂', mmhg: '(mmHg)', l: 'L', r: 'R', avg: 'average', '5day': '5-day', '7day': '7-day' }

// "co2_5day_avg_mmhg" -> "CO₂ 5-day average (mmHg)"
export function labelFor(key) {
  const text = key
    .split('_')
    .map((word) => WORDS[word] ?? word)
    .join(' ')
    .replace(' L R', ' L / R')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Table columns = the keys of the first row, in the order the API sends them.
// Sightline reports on the eyes (SANS) only, so the all-parts "overall" column is left out.
const HIDDEN_COLUMNS = new Set(['overall'])
export function tableColumns(rows) {
  return rows?.length ? Object.keys(rows[0]).filter((key) => !HIDDEN_COLUMNS.has(key)) : []
}

// [key, value] pairs of an object, for key/value grids.
export function fieldsOf(object) {
  return Object.entries(object ?? {})
}

// Lists may hold plain strings or { text } objects.
export function textOf(item) {
  return typeof item === 'string' ? item : item?.text
}

// One-line text for nested objects, e.g. { a: 1, b: 2 } -> "A: 1 · B: 2".
export function inlineObject(value) {
  return fieldsOf(value)
    .map(([k, v]) => `${labelFor(k)}: ${v}`)
    .join(' · ')
}
