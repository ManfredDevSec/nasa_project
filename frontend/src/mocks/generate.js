// Builds the simulated mission history (cabin CO₂, daily logs and weekly eye checks).
// A fixed seed means the "random" numbers are identical on every page load.
import { CONFIG } from './scoring.js'

const SEED = 20260815

// mulberry32: a tiny, well-known seeded random number generator. Returns 0 <= n < 1.
function seededRandom(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Mission day 1 is the start date.
export function dateForDay(startDate, day) {
  const d = new Date(`${startDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + day - 1)
  return d.toISOString().slice(0, 10)
}

// One weekly check. Amsler marks and symptoms default to none.
const check = (day, nearL, nearR, conL, conR, extra = {}) => ({
  mission_day: day,
  near_vision_left: nearL,
  near_vision_right: nearR,
  contrast_left: conL,
  contrast_right: conR,
  amsler_left: [],
  amsler_right: [],
  headache: 0,
  eye_pressure: 0,
  blur: 0,
  ...extra,
})

const WEEKLY_DAYS = Array.from({ length: 13 }, (_, i) => (i + 1) * 7) // 7, 14 ... 91

// The demo story for each astronaut's eye tests (must match the backend seed).
const CHECK_STORY = {
  // Osei: normal until day 77, then drifts after the CO₂ rise. Day 92 is the live demo test.
  1: [
    ...WEEKLY_DAYS.filter((d) => d <= 77).map((d) => check(d, 8, 8, 6, 6)),
    check(84, 7, 8, 6, 6),
    check(86, 7, 8, 5, 6), // retest
    check(91, 6, 8, 5, 6, { amsler_left: [[3, 4], [3, 5], [4, 4]], headache: 1, blur: 1 }),
  ],
  // Mensah: steady and GREEN every week.
  2: WEEKLY_DAYS.map((d) => check(d, 9, 9, 7, 7)),
  // Adjei: GREEN except day 42 (symptoms during a short-sleep week), GREEN retest on day 44.
  3: [
    ...WEEKLY_DAYS.map((d) => (d === 42 ? check(d, 8, 8, 6, 6, { headache: 2, eye_pressure: 1 }) : check(d, 8, 8, 6, 6))),
    check(44, 8, 8, 6, 6),
  ].sort((a, b) => a.mission_day - b.mission_day),
}

export function generateMockData(mission, crew) {
  const rand = seededRandom(SEED)
  const between = (min, max, decimals = 0) => {
    const f = 10 ** decimals
    return Math.round((min + rand() * (max - min)) * f) / f
  }
  const today = mission.mission_day_today
  const days = Array.from({ length: today }, (_, i) => i + 1)
  const date = (day) => dateForDay(mission.start_date, day)

  // Cabin CO₂ (mmHg): normal, then high from day 78 to 88, then partly recovered.
  const cabinLogs = days.map((day) => {
    const [min, max] = day <= 77 ? [2.3, 2.7] : day <= 88 ? [4.2, 5.0] : [3.0, 3.4]
    return { mission_day: day, date: date(day), co2_mmhg: between(min, max, 2) }
  })

  // Daily logs per astronaut, inside the normal ranges except for the story overrides.
  const N = CONFIG.normal
  let logId = 1
  const dailyLogs = {}
  for (const member of crew) {
    dailyLogs[member.id] = days.map((day) => {
      const log = {
        id: logId++,
        astronaut: member.id,
        date: date(day),
        mission_day: day,
        resting_hr: between(...N.resting_hr),
        bp_systolic: between(...N.bp_systolic),
        bp_diastolic: between(...N.bp_diastolic),
        sleep_hours: between(...N.sleep_hours, 1),
        mood: between(...N.mood),
        sodium_mg: Math.round(between(...N.sodium_mg) / 10) * 10,
        exercise_min: between(...N.exercise_min),
      }
      if (member.id === 1 && day >= 75) {
        // Osei: salty food and little exercise in the run-up to the eye changes.
        log.sodium_mg = Math.round(between(3600, 4200) / 10) * 10
        log.exercise_min = Math.round(50 + rand() ** 1.6 * 20) // 50-70, mostly at the low end
      }
      if (member.id === 3 && day >= 40 && day <= 48) {
        // Adjei: a short-sleep, low-mood week around the day-42 symptoms.
        log.sleep_hours = between(4.8, 6.0, 1)
        log.mood = 3
      }
      return log
    })
  }

  // Weekly checks with ids and dates filled in.
  let checkId = 1
  const checks = {}
  for (const member of crew) {
    checks[member.id] = (CHECK_STORY[member.id] ?? []).map((c) => ({
      id: checkId++,
      astronaut: member.id,
      date: date(c.mission_day),
      is_baseline: false,
      ...c,
    }))
  }

  const events = [{ mission_day: 78, date: date(78), type: 'CO2_HIGH_START', text: 'Cabin CO₂ above normal' }]

  return { cabinLogs, dailyLogs, checks, events }
}
