// Mock scoring: used ONLY in mock mode. The real backend does this otherwise.
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ All thresholds below are DEMO VALUES for the hackathon prototype.        │
// │ They are NOT clinical standards and must not be used for real decisions. │
// └──────────────────────────────────────────────────────────────────────────┘
export const CONFIG = {
  red: { nearDrift: 2, contrastDrift: 2, symptomScore: 6 },
  amber: { nearDrift: 1, contrastDrift: 1, symptomScore: 3 },
  // "Declining" = over the last 3 previous checks plus this one, near vision never improves
  // and drops by at least this many lines in total.
  declining: { previousChecks: 3, minTotalDrop: 1 },
  worseEye: { amslerPoints: 2, minScore: 1, bothMargin: 0.5 },
  insights: {
    windowDays: 7,
    co2HighMmhg: 3.5,
    co2MinHighDays: 3,
    co2NormalMmhg: 2.5,
    sodiumHighMg: 3500,
    exerciseLowMin: 60,
  },
  nextTestDays: { GREEN: 7, OTHER: 2 },
  // Demo "normal" ranges for daily logs (min, max).
  normal: {
    resting_hr: [58, 70],
    bp_systolic: [110, 124],
    bp_diastolic: [70, 80],
    sleep_hours: [6.8, 8.2],
    mood: [4, 5],
    sodium_mg: [2600, 3200],
    exercise_min: [90, 130],
  },
  // Cabin CO₂ status from the 5-day average (mmHg).
  cabin: { averageDays: 5, greenBelow: 3.0, amberBelow: 4.0 },
}

const EYES = ['left', 'right']
const round2 = (n) => Math.round(n * 100) / 100
const cap = (s) => s[0].toUpperCase() + s.slice(1)
const plural = (n, word) => `${word}${n === 1 ? '' : 's'}`
const average = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Score one eye check.
 * @param check          the new check (same fields as POST /checks/ plus date and mission_day)
 * @param baseline       { near_vision_left, near_vision_right, contrast_left, contrast_right }
 * @param previousChecks earlier checks for this astronaut, oldest first
 * @param cabinLogs      [{ mission_day, co2_mmhg }]
 * @param dailyLogs      [{ mission_day, sodium_mg, exercise_min, ... }] for this astronaut
 * @returns the `assessment` object in the API shape
 */
export function assess(check, baseline, previousChecks, cabinLogs, dailyLogs) {
  const previous = previousChecks[previousChecks.length - 1]

  // 1. Drift = baseline - value. Positive means worse than normal.
  const drift = {}
  for (const eye of EYES) {
    drift[`near_${eye}`] = round2(baseline[`near_vision_${eye}`] - check[`near_vision_${eye}`])
    drift[`contrast_${eye}`] = round2(baseline[`contrast_${eye}`] - check[`contrast_${eye}`])
  }

  // 2. Amsler: marks now, and whether they are new since the previous check.
  const marks = (c, eye) => (c?.[`amsler_${eye}`] ?? []).length > 0
  const new_amsler = {}
  for (const eye of EYES) new_amsler[eye] = marks(check, eye) && !marks(previous, eye)
  const any_amsler = EYES.some((eye) => marks(check, eye))

  // 3. Symptoms (each 0-3, so 0-9 in total).
  const symptom_score = check.headache + check.eye_pressure + check.blur

  // 4. Declining near vision over the recent tests.
  const recent = [...previousChecks.slice(-CONFIG.declining.previousChecks), check]
  const declining = {}
  for (const eye of EYES) {
    const values = recent.map((c) => c[`near_vision_${eye}`])
    const neverImproves = values.every((v, i) => i === 0 || v <= values[i - 1])
    declining[eye] = values.length > 1 && neverImproves && values[0] - values[values.length - 1] >= CONFIG.declining.minTotalDrop
  }

  // 5. Level.
  const maxNear = Math.max(drift.near_left, drift.near_right)
  const maxContrast = Math.max(drift.contrast_left, drift.contrast_right)
  const anyNew = new_amsler.left || new_amsler.right
  const anyDeclining = declining.left || declining.right
  let level = 'GREEN'
  if (
    maxNear >= CONFIG.red.nearDrift ||
    maxContrast >= CONFIG.red.contrastDrift ||
    anyNew ||
    symptom_score >= CONFIG.red.symptomScore
  ) {
    level = 'RED'
  } else if (
    maxNear >= CONFIG.amber.nearDrift ||
    maxContrast >= CONFIG.amber.contrastDrift ||
    anyDeclining ||
    any_amsler ||
    symptom_score >= CONFIG.amber.symptomScore
  ) {
    level = 'AMBER'
  }

  // 6. Worse eye.
  const eyeScore = (eye) => drift[`near_${eye}`] + drift[`contrast_${eye}`] + (marks(check, eye) ? CONFIG.worseEye.amslerPoints : 0)
  const scoreL = eyeScore('left')
  const scoreR = eyeScore('right')
  let worse_eye = null
  if (scoreL >= CONFIG.worseEye.minScore || scoreR >= CONFIG.worseEye.minScore) {
    if (Math.abs(scoreL - scoreR) < CONFIG.worseEye.bothMargin) worse_eye = 'BOTH'
    else worse_eye = scoreL > scoreR ? 'LEFT' : 'RIGHT'
  }

  // 7. Reasons: one sentence per rule that fired.
  const reasons = []
  for (const eye of EYES) {
    const n = drift[`near_${eye}`]
    if (n >= CONFIG.amber.nearDrift) reasons.push(`${cap(eye)} eye near vision is ${n} ${plural(n, 'line')} below your normal.`)
  }
  for (const eye of EYES) {
    const n = drift[`contrast_${eye}`]
    if (n >= CONFIG.amber.contrastDrift) reasons.push(`${cap(eye)} eye contrast is ${n} ${plural(n, 'level')} below your normal.`)
  }
  for (const eye of EYES) {
    if (new_amsler[eye]) reasons.push(`New wavy or missing area on the ${eye}-eye grid.`)
    else if (marks(check, eye)) reasons.push(`Wavy area still present on the ${eye}-eye grid.`)
  }
  for (const eye of EYES) {
    if (declining[eye]) reasons.push(`${cap(eye)} eye vision has dropped over your last ${recent.length} tests.`)
  }
  if (symptom_score >= CONFIG.amber.symptomScore) {
    reasons.push(`You reported headache / eye pressure / blur (score ${symptom_score}/9).`)
  }
  if (level === 'GREEN') reasons.splice(0, reasons.length, 'Your vision matches your normal. Keep it up.')

  // 8. Environment insights, only for AMBER or RED, over the 7 days before the check.
  const env_insights = []
  if (level !== 'GREEN') {
    const { windowDays } = CONFIG.insights
    const inWindow = (log) => log.mission_day >= check.mission_day - windowDays && log.mission_day < check.mission_day
    const cabinWeek = cabinLogs.filter(inWindow)
    const dailyWeek = dailyLogs.filter(inWindow)

    const highDays = cabinWeek.filter((l) => l.co2_mmhg > CONFIG.insights.co2HighMmhg).length
    if (highDays >= CONFIG.insights.co2MinHighDays) {
      env_insights.push({
        type: 'CO2',
        text: `This change followed ${highDays} days of high cabin CO₂.`,
        value: round2(average(cabinWeek.map((l) => l.co2_mmhg))),
        normal: CONFIG.insights.co2NormalMmhg,
      })
    }
    const sodium = average(dailyWeek.map((l) => l.sodium_mg))
    if (sodium != null && sodium > CONFIG.insights.sodiumHighMg) {
      env_insights.push({ type: 'SODIUM', text: 'Salt intake has been high this week.', value: Math.round(sodium) })
    }
    const exercise = average(dailyWeek.map((l) => l.exercise_min))
    if (exercise != null && exercise < CONFIG.insights.exerciseLowMin) {
      env_insights.push({ type: 'EXERCISE', text: 'Exercise has been below target this week.', value: Math.round(exercise) })
    }
  }

  // 9. Actions (priority 1 = most urgent).
  const ACTIONS = {
    NEXT_WEEKLY: { text: 'Next test in 7 days.', priority: 3 },
    RETEST_48H: { text: 'Retest within 48 hours.', priority: 2 },
    NOTIFY_MO: { text: 'Let the Crew Medical Officer know.', priority: 2 },
    NOTIFY_MO_NOW: { text: 'Tell the Crew Medical Officer now.', priority: 1 },
    ESCALATE_EARTH: { text: 'A priority note will go to the flight surgeon.', priority: 1 },
    CHECK_CO2: { text: 'Ask for a CO₂ scrubber check.', priority: 2 },
    REDUCE_SALT: { text: 'Choose lower-salt meals this week.', priority: 3 },
    EXERCISE: { text: 'Get back to your exercise target.', priority: 3 },
    LOG_SYMPTOMS: { text: 'Note when the symptoms happen.', priority: 3 },
  }
  const codes =
    level === 'GREEN'
      ? ['NEXT_WEEKLY']
      : level === 'AMBER'
        ? ['RETEST_48H', 'NOTIFY_MO']
        : ['NOTIFY_MO_NOW', 'ESCALATE_EARTH', 'RETEST_48H']
  const insightAction = { CO2: 'CHECK_CO2', SODIUM: 'REDUCE_SALT', EXERCISE: 'EXERCISE' }
  env_insights.forEach((insight) => codes.push(insightAction[insight.type]))
  if (symptom_score >= CONFIG.amber.symptomScore) codes.push('LOG_SYMPTOMS')
  const actions = codes.map((code) => ({ code, ...ACTIONS[code] })).sort((a, b) => a.priority - b.priority)

  return {
    level,
    reasons,
    actions,
    env_insights,
    escalate_to_earth: level === 'RED',
    worse_eye,
    drift,
    new_amsler,
    any_amsler,
    declining,
    symptom_score,
    next_test_due: addDays(check.date, level === 'GREEN' ? CONFIG.nextTestDays.GREEN : CONFIG.nextTestDays.OTHER),
  }
}
