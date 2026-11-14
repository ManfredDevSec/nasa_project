export function fmt(value, dp) {
  if (value == null) return '—'
  return Number(value).toFixed(dp)
}
