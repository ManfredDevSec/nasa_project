// Date helpers. All dates from the API are "YYYY-MM-DD" strings.

const toUTC = (iso) => new Date(`${iso}T00:00:00Z`)

// The calendar date of the mission's current day (day 1 = start_date).
// Falls back to the device's date when the mission is not known.
export function missionToday(mission) {
  if (mission?.start_date && mission?.mission_day_today) {
    const d = toUTC(mission.start_date)
    d.setUTCDate(d.getUTCDate() + mission.mission_day_today - 1)
    return d.toISOString().slice(0, 10)
  }
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function daysBetween(fromIso, toIso) {
  return Math.round((toUTC(toIso) - toUTC(fromIso)) / 86400000)
}

// "Mon 16 Nov"
export function shortDate(iso) {
  if (!iso) return '–'
  const d = toUTC(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

// "In 2 days", "Today", "Overdue by 1 day"
export function relativeDue(dueIso, todayIso) {
  if (!dueIso) return 'Not scheduled'
  const diff = daysBetween(todayIso, dueIso)
  if (diff === 0) return 'Today'
  if (diff < 0) return `Overdue by ${-diff} day${diff === -1 ? '' : 's'}`
  return `In ${diff} day${diff === 1 ? '' : 's'}`
}
