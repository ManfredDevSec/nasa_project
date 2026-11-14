// Helpers for GET /astronauts/{id}/trends/.

// Chart 2 options. `source` names the array in the trends response that holds the field.
export const FACTORS = [
  { key: 'co2_mmhg', source: 'cabin_co2', label: 'Cabin CO₂', unit: 'mmHg' },
  { key: 'sodium_mg', source: 'daily', label: 'Sodium', unit: 'mg' },
  { key: 'exercise_min', source: 'daily', label: 'Exercise', unit: 'min' },
  { key: 'sleep_hours', source: 'daily', label: 'Sleep', unit: 'hours' },
]

// Copy of the rows ordered by mission_day (the API order is not assumed).
export function byMissionDay(rows) {
  return [...(rows ?? [])].sort((a, b) => a.mission_day - b.mission_day)
}

export function latestRow(rows) {
  const sorted = byMissionDay(rows)
  return sorted[sorted.length - 1] ?? null
}

// One x-axis range [first day, last day] covering every array passed in, so both charts line up.
export function sharedDayDomain(...arrays) {
  const days = arrays.flat().map((row) => row.mission_day)
  return days.length ? [Math.min(...days), Math.max(...days)] : [0, 1]
}

// Factors that actually have data in this response.
export function availableFactors(trends) {
  return FACTORS.filter((f) => (trends?.[f.source] ?? []).some((row) => row[f.key] != null))
}

// The rows of the factor's source array that contain a value for it.
export function factorRows(trends, factor) {
  if (!factor) return []
  return byMissionDay(trends?.[factor.source]).filter((row) => row[factor.key] != null)
}

// Dashed baseline lines from baseline.near_vision_left / _right (one line if they are equal).
export function baselineLines(baseline) {
  const left = baseline?.near_vision_left
  const right = baseline?.near_vision_right
  if (left != null && left === right) return [{ y: left, label: `Baseline (both eyes) ${left}`, position: 'insideBottomLeft' }]
  return [
    left != null && { y: left, label: `Left baseline ${left}`, position: 'insideBottomLeft' },
    right != null && { y: right, label: `Right baseline ${right}`, position: 'insideTopLeft' },
  ].filter(Boolean)
}
