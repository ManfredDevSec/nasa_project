// In-memory "fake backend" used in mock mode.
// It builds every response from the generated history, so a new eye test or daily log
// immediately shows up in the body map, trends, crew overview and report.
// Everything resets when the page is reloaded.
import crew from './crew.json'
import mission from './mission.json'
import partInfo from './part-info.json'
import users from './login.json'
import { dateForDay, generateMockData } from './generate.js'
import { CONFIG, assess } from './scoring.js'

const TODAY = mission.mission_day_today
const TODAY_DATE = dateForDay(mission.start_date, TODAY)
const PARTS = ['EYES', 'HEART', 'SLEEP', 'MIND']
const RANK = { UNKNOWN: 0, GREEN: 1, AMBER: 2, RED: 3 }

const generated = generateMockData(mission, crew)
const cabinLogs = generated.cabinLogs
const dailyLogs = generated.dailyLogs
const history = {} // { [astronautId]: [{ check, assessment }] }, oldest first
let nextCheckId = 1000
let nextLogId = 5000

// Score every historical check in order, exactly like the live test will be scored.
for (const member of crew) {
  history[member.id] = []
  generated.checks[member.id].forEach((check) => addToHistory(member, check))
}

function addToHistory(member, check) {
  const previous = history[member.id].map((h) => h.check)
  const assessment = assess(check, member.baseline, previous, cabinLogs, dailyLogs[member.id])
  const entry = { check, assessment }
  history[member.id].push(entry)
  return entry
}

// ── small helpers ────────────────────────────────────────────────────────────
// Errors use the backend's one shape: { error: { code, message, details } } (API notes, section 2).
const httpError = (status, code, message, details = {}) => ({ response: { status, data: { error: { code, message, details } } } })
const invalid = (details) => httpError(400, 'VALIDATION_ERROR', 'Some fields are invalid.', details)
const round1 = (n) => Math.round(n * 10) / 10
const average = (list, key) => (list.length ? list.reduce((sum, item) => sum + item[key], 0) / list.length : null)
const lastDays = (logs, endDay, n) => logs.filter((l) => l.mission_day > endDay - n && l.mission_day <= endDay)
const inRange = (value, [min, max]) => value >= min && value <= max
const worst = (levels) => levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'UNKNOWN')
const dayOf = (isoDate) => Math.round((new Date(`${isoDate}T00:00:00Z`) - new Date(`${mission.start_date}T00:00:00Z`)) / 86400000) + 1
const cap = (s) => s[0].toUpperCase() + s.slice(1)

function findMember(id) {
  const member = crew.find((c) => c.id === Number(id))
  if (!member) throw httpError(404, 'NOT_FOUND', 'Not found.')
  return member
}

const latestEntry = (id) => history[id][history[id].length - 1]
const isOverdue = (id) => {
  const latest = latestEntry(id)
  return !latest || latest.assessment.next_test_due < TODAY_DATE
}

// Short crew-dashboard headline from the latest eye test, e.g. "Left eye 2 lines below normal".
function headlineFor(id) {
  const latest = latestEntry(id)
  if (!latest) return 'No eye test yet'
  const { drift, any_amsler, symptom_score } = latest.assessment
  const worstOf = (kind) => ['left', 'right'].map((eye) => ({ eye, n: drift[`${kind}_${eye}`] })).sort((a, b) => b.n - a.n)[0]
  const near = worstOf('near')
  if (near.n >= CONFIG.amber.nearDrift) return `${cap(near.eye)} eye ${near.n} line${near.n === 1 ? '' : 's'} below normal`
  const contrast = worstOf('contrast')
  if (contrast.n >= CONFIG.amber.contrastDrift) return `${cap(contrast.eye)} eye contrast ${contrast.n} below normal`
  if (any_amsler) return 'Wavy area marked on the eye grid'
  if (symptom_score >= CONFIG.amber.symptomScore) return 'Symptoms reported at last test'
  return 'Vision matches normal'
}

// Status + one-line summary for each of the four body parts.
function partStatus(id) {
  const latest = latestEntry(id)
  const week = lastDays(dailyLogs[id], TODAY, 7)
  const status = {
    EYES: latest
      ? { level: latest.assessment.level, summary: latest.assessment.reasons[0] }
      : { level: 'UNKNOWN', summary: 'No eye test yet.' },
  }
  if (!week.length) {
    for (const part of ['HEART', 'SLEEP', 'MIND']) status[part] = { level: 'UNKNOWN', summary: 'No daily logs in the last 7 days.' }
    return status
  }
  const N = CONFIG.normal
  const hr = average(week, 'resting_hr')
  const sys = average(week, 'bp_systolic')
  const dia = average(week, 'bp_diastolic')
  const sleep = average(week, 'sleep_hours')
  const mood = average(week, 'mood')
  status.HEART = {
    level: inRange(hr, N.resting_hr) && inRange(sys, N.bp_systolic) && inRange(dia, N.bp_diastolic) ? 'GREEN' : 'AMBER',
    summary: `This week: resting heart rate ${Math.round(hr)} bpm, blood pressure ${Math.round(sys)}/${Math.round(dia)}.`,
  }
  status.SLEEP = {
    level: inRange(sleep, N.sleep_hours) ? 'GREEN' : 'AMBER',
    summary: `You averaged ${round1(sleep)} hours of sleep this week.`,
  }
  status.MIND = {
    level: inRange(mood, N.mood) ? 'GREEN' : 'AMBER',
    summary: `Your average mood this week was ${round1(mood)} out of 5.`,
  }
  return status
}

function cabinSummary() {
  const today = cabinLogs.find((l) => l.mission_day === TODAY)
  const recent = lastDays(cabinLogs, TODAY, CONFIG.cabin.averageDays)
  const avg = Math.round(average(recent, 'co2_mmhg') * 100) / 100
  const co2_level = avg < CONFIG.cabin.greenBelow ? 'GREEN' : avg < CONFIG.cabin.amberBelow ? 'AMBER' : 'RED'
  return { co2_mmhg_today: today?.co2_mmhg ?? null, co2_5day_avg: avg, co2_level }
}

// Patterns across the crew for the last 7 days (shown with the "not a proven cause" caption).
function crewInsights() {
  const insights = []
  const highDays = lastDays(cabinLogs, TODAY, 7).filter((l) => l.co2_mmhg > CONFIG.insights.co2HighMmhg).length
  if (highDays > 0) {
    insights.push({ type: 'CO2', call_sign: null, text: `Cabin CO₂ was above ${CONFIG.insights.co2HighMmhg} mmHg on ${highDays} of the last 7 days.` })
  }
  for (const member of crew) {
    const week = lastDays(dailyLogs[member.id], TODAY, 7)
    if (average(week, 'sodium_mg') > CONFIG.insights.sodiumHighMg) {
      insights.push({ type: 'SODIUM', call_sign: member.call_sign, text: `${member.call_sign}: salt intake has been high this week.` })
    }
    if (average(week, 'exercise_min') < CONFIG.insights.exerciseLowMin) {
      insights.push({ type: 'EXERCISE', call_sign: member.call_sign, text: `${member.call_sign}: exercise has been below target this week.` })
    }
  }
  return insights
}

function crewRow(member) {
  const status = partStatus(member.id)
  const parts = Object.fromEntries(PARTS.map((p) => [p, status[p].level]))
  return {
    astronaut_id: member.id,
    name: member.name,
    call_sign: member.call_sign,
    overall: worst(Object.values(parts)),
    // like the real API (docs/03 R4): one field per part
    eyes: parts.EYES,
    heart: parts.HEART,
    sleep: parts.SLEEP,
    mind: parts.MIND,
    headline: headlineFor(member.id),
    overdue: isOverdue(member.id),
  }
}

// ── authentication (same rules and error bodies as the real API) ────────────
// Every seeded token stays valid across page reloads; logging out revokes it.
// A token the mock does not know came from the real login (mixed mode, e.g. VITE_USE_MOCKS=bodyMap),
// so the mock trusts the user saved at login instead.
const usersByToken = {} // token -> account record; filled in the accounts section below
const revokedTokens = new Set()
const MEDICAL = ['MEDICAL_OFFICER', 'FLIGHT_SURGEON', 'ADMIN']

function requireUser(auth) {
  if (!auth?.token) throw httpError(401, 'NOT_AUTHENTICATED', 'Authentication credentials were not provided.')
  if (revokedTokens.has(auth.token)) throw httpError(401, 'NOT_AUTHENTICATED', 'Invalid token.')
  const user = usersByToken[auth.token] ?? auth.user
  if (!user) throw httpError(401, 'NOT_AUTHENTICATED', 'Invalid token.')
  return user
}
const forbidden = () => httpError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this action.')

function requireMedical(auth) {
  const user = requireUser(auth)
  if (!MEDICAL.includes(user.role)) throw forbidden()
  return user
}
// Astronauts may read their own data; medical roles may read anyone's.
function requireSelfOrMedical(auth, astronautId) {
  const user = requireUser(auth)
  if (!MEDICAL.includes(user.role) && user.astronaut_id !== Number(astronautId)) throw forbidden()
  return user
}

// ── response shapes (only the fields the API returns) ────────────────────────
const checkResponse = (check) => ({
  id: check.id,
  astronaut: check.astronaut,
  taken_at: check.taken_at ?? `${check.date}T09:00:00Z`,
  near_vision_left: check.near_vision_left,
  near_vision_right: check.near_vision_right,
  contrast_left: check.contrast_left,
  contrast_right: check.contrast_right,
  amsler_left: check.amsler_left,
  amsler_right: check.amsler_right,
  headache: check.headache,
  eye_pressure: check.eye_pressure,
  blur: check.blur,
  is_baseline: check.is_baseline,
  distance_ok: null,
  notes: null,
})
const dailyResponse = (log) => ({
  date: log.date,
  mission_day: log.mission_day,
  resting_hr: log.resting_hr,
  bp_systolic: log.bp_systolic,
  bp_diastolic: log.bp_diastolic,
  sleep_hours: log.sleep_hours,
  mood: log.mood,
  sodium_mg: log.sodium_mg,
  exercise_min: log.exercise_min,
})

// ── endpoint handlers: (auth, ...arguments) → response body, or throw an error ─

// ── accounts (login, profile, passwords, admin user management) ─────────────
// One record per account, shared by every token that belongs to it, so a profile edit
// or a role change shows up everywhere at once.
const ROLES = ['CREW', 'MEDICAL_OFFICER', 'FLIGHT_SURGEON', 'ADMIN']
const ASTRONAUT_ROLES = ['CREW', 'MEDICAL_OFFICER']
const SEEDED_AT = `${mission.start_date}T08:00:00Z`
const accountById = new Map()
const tokenByUserId = new Map()
for (const { token, user } of Object.values(users)) {
  const account = { ...user, is_active: true, last_login: null, date_joined: SEEDED_AT }
  accountById.set(user.id, account)
  tokenByUserId.set(user.id, token)
  usersByToken[token] = account
}
let nextUserId = 100
let tokenSerial = 1

const publicUser = (a) => ({
  id: a.id,
  username: a.username,
  role: a.role,
  display_name: a.display_name,
  astronaut_id: a.astronaut_id,
  email: a.email,
  first_name: a.first_name,
  last_name: a.last_name,
})
const adminUser = (a) => ({ ...publicUser(a), is_active: a.is_active, last_login: a.last_login, date_joined: a.date_joined })
const findAccountByUsername = (name) =>
  [...accountById.values()].find((a) => a.username.toLowerCase() === String(name ?? '').trim().toLowerCase())
const validEmail = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
const toAstronautId = (value) => (value === '' || value == null ? null : Number(value))
const displayNameOf = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ') || a.username

function issueToken(account) {
  const token = `demo-token-${account.username}-${(tokenSerial++).toString(36)}${Date.now().toString(36)}`
  tokenByUserId.set(account.id, token)
  usersByToken[token] = account
  return token
}

// The server's password rules (shown as a hint on the forms; the server checks them too).
function passwordProblems(password, account = {}) {
  const problems = []
  if (password.length < 8) problems.push('This password is too short. It must contain at least 8 characters.')
  if (/^\d+$/.test(password)) problems.push('This password is entirely numeric.')
  if (['password', 'password1', 'password123', '12345678', '123456789', 'qwerty123', 'sightline'].includes(password.toLowerCase()))
    problems.push('This password is too common.')
  const near = [account.username, account.first_name, account.last_name, String(account.email ?? '').split('@')[0]]
  if (near.some((part) => part && part.length >= 3 && password.toLowerCase().includes(part.toLowerCase())))
    problems.push('The password is too similar to your name, username or email.')
  return problems
}

function requireAdmin(auth) {
  const user = requireUser(auth)
  if (user.role !== 'ADMIN') throw forbidden()
  return user
}

// Crew and medical officers need a linked astronaut; flight surgeons and admins must not have one.
function checkRoleAndAstronaut(role, astronautId, errors) {
  if (!ROLES.includes(role)) errors.role = [`"${role ?? ''}" is not a valid choice.`]
  else if (ASTRONAUT_ROLES.includes(role) && astronautId == null) errors.astronaut_id = ['This role needs a linked astronaut.']
  else if (!ASTRONAUT_ROLES.includes(role) && astronautId != null) errors.astronaut_id = ['This role cannot be linked to an astronaut.']
  else if (astronautId != null && !crew.some((c) => c.id === astronautId)) errors.astronaut_id = ['No astronaut with that id.']
}

export function login(username) {
  // Demo note: the mock checks the username only; the real API checks the password too.
  const account = findAccountByUsername(username)
  if (!account || !account.is_active) throw httpError(400, 'INVALID_CREDENTIALS', 'Unable to log in with provided credentials.')
  const token = tokenByUserId.get(account.id)
  revokedTokens.delete(token)
  account.last_login = new Date().toISOString()
  return { token, user: publicUser(account) }
}

export function logout(auth) {
  requireUser(auth)
  revokedTokens.add(auth.token)
  return null // 204 No Content
}

export function me(auth) {
  const user = requireUser(auth)
  return publicUser(accountById.get(user.id) ?? user)
}

export function updateMe(auth, changes) {
  const user = requireUser(auth)
  const account = accountById.get(user.id)
  if (!account) return publicUser(user)
  if (changes.email && !validEmail(changes.email)) throw invalid({ email: ['Enter a valid email address.'] })
  for (const key of ['email', 'first_name', 'last_name']) if (key in changes) account[key] = String(changes[key] ?? '')
  return publicUser(account)
}

export function changePassword(auth, { old_password, new_password }) {
  const user = requireUser(auth)
  const account = accountById.get(user.id) ?? user
  const errors = {}
  const current = account.password ?? import.meta.env.VITE_DEMO_PASSWORD ?? ''
  if (!old_password) errors.old_password = ['This field may not be blank.']
  else if (current && old_password !== current) errors.old_password = ['Your old password was entered incorrectly. Please enter it again.']
  const problems = passwordProblems(String(new_password ?? ''), account)
  if (problems.length) errors.new_password = problems
  if (Object.keys(errors).length) throw invalid(errors)
  account.password = new_password
  revokedTokens.add(auth.token) // the old token stops working at once
  return { token: issueToken(account) }
}

export function passwordReset() {
  // Always the same answer, so nobody can find out which emails have accounts.
  return { detail: 'If an account uses that email, we sent a link to reset the password.' }
}

export function passwordResetConfirm({ uid, token, new_password }) {
  // Demo: any link works except one whose token is "expired".
  if (!uid || !token || token === 'expired') throw invalid({ token: ['This link is invalid or has expired.'] })
  const problems = passwordProblems(String(new_password ?? ''))
  if (problems.length) throw invalid({ new_password: problems })
  return { detail: 'Your password has been set.' }
}

export function listUsers(auth, { role, is_active, search } = {}) {
  requireAdmin(auth)
  const q = String(search ?? '').trim().toLowerCase()
  return [...accountById.values()]
    .filter((a) => !role || a.role === role)
    .filter((a) => is_active == null || String(a.is_active) === String(is_active))
    .filter((a) => !q || [a.username, a.first_name, a.last_name, a.email, a.display_name].some((v) => String(v ?? '').toLowerCase().includes(q)))
    .sort((a, b) => a.id - b.id)
    .map(adminUser)
}

export function getUserById(auth, id) {
  requireAdmin(auth)
  const account = accountById.get(Number(id))
  if (!account) throw httpError(404, 'NOT_FOUND', 'Not found.')
  return adminUser(account)
}

export function createUser(auth, payload) {
  requireAdmin(auth)
  const errors = {}
  const username = String(payload.username ?? '').trim()
  const astronautId = toAstronautId(payload.astronaut_id)
  if (!username) errors.username = ['This field may not be blank.']
  else if (!/^[\w.@+-]+$/.test(username)) errors.username = ['Use letters, numbers and @ . + - _ only.']
  else if (findAccountByUsername(username)) errors.username = ['A user with that username already exists.']
  checkRoleAndAstronaut(payload.role, astronautId, errors)
  if (payload.email && !validEmail(payload.email)) errors.email = ['Enter a valid email address.']
  if (payload.password) {
    const problems = passwordProblems(payload.password, { ...payload, username })
    if (problems.length) errors.password = problems
  } else if (!payload.email) {
    errors.email = ['An email is needed to send the invite (or set a password).']
  }
  if (Object.keys(errors).length) throw invalid(errors)
  const account = {
    id: nextUserId++,
    username,
    role: payload.role,
    astronaut_id: astronautId,
    email: String(payload.email ?? ''),
    first_name: String(payload.first_name ?? ''),
    last_name: String(payload.last_name ?? ''),
    is_active: true,
    last_login: null,
    date_joined: new Date().toISOString(),
    password: payload.password || null,
  }
  account.display_name = displayNameOf(account)
  accountById.set(account.id, account)
  issueToken(account)
  return adminUser(account)
}

export function updateUser(auth, id, changes) {
  requireAdmin(auth)
  const account = accountById.get(Number(id))
  if (!account) throw httpError(404, 'NOT_FOUND', 'Not found.')
  const errors = {}
  const role = changes.role ?? account.role
  const astronautId = 'astronaut_id' in changes ? toAstronautId(changes.astronaut_id) : account.astronaut_id
  checkRoleAndAstronaut(role, astronautId, errors)
  if (changes.email && !validEmail(changes.email)) errors.email = ['Enter a valid email address.']
  if (changes.password) {
    const problems = passwordProblems(changes.password, account)
    if (problems.length) errors.password = problems
  }
  if (Object.keys(errors).length) throw invalid(errors)
  Object.assign(account, { role, astronaut_id: astronautId })
  for (const key of ['email', 'first_name', 'last_name']) if (key in changes) account[key] = String(changes[key] ?? '')
  if ('is_active' in changes) account.is_active = Boolean(changes.is_active)
  if (changes.password) account.password = changes.password
  account.display_name = displayNameOf(account)
  return adminUser(account)
}

export function deactivateUser(auth, id) {
  requireAdmin(auth)
  const account = accountById.get(Number(id))
  if (!account) throw httpError(404, 'NOT_FOUND', 'Not found.')
  account.is_active = false
  const token = tokenByUserId.get(account.id)
  if (token) revokedTokens.add(token) // signed out everywhere
  return null // 204 No Content
}

export function activeMission(auth) {
  requireUser(auth)
  return mission
}

export function bodyMap(auth, id) {
  requireSelfOrMedical(auth, id)
  const member = findMember(id)
  const status = partStatus(member.id)
  const actions = {
    EYES: { label: 'Take the eye test', route: '/test' },
    HEART: { label: 'See my trends', route: `/trends/${member.id}` },
    SLEEP: { label: 'See my trends', route: `/trends/${member.id}` },
    MIND: { label: 'Learn more', route: '/learn' },
  }
  const parts = PARTS.map((part) => ({ part, ...status[part], info: partInfo[part], action: actions[part] }))
  return { overall: worst(parts.map((p) => p.level)), parts }
}

export function submitCheck(auth, payload) {
  const user = requireUser(auth)
  if (user.astronaut_id !== Number(payload.astronaut)) throw forbidden()
  const member = findMember(payload.astronaut)
  if (!member.baseline) throw httpError(409, 'NO_BASELINE', 'No baseline recorded for this astronaut.')
  const check = {
    id: nextCheckId++,
    astronaut: member.id,
    taken_at: new Date(`${TODAY_DATE}T${new Date().toISOString().slice(11)}`).toISOString(),
    date: TODAY_DATE, // used by the mock only (scoring windows), not returned
    mission_day: TODAY, // used by the mock only, not returned
    near_vision_left: payload.near_vision_left,
    near_vision_right: payload.near_vision_right,
    contrast_left: payload.contrast_left,
    contrast_right: payload.contrast_right,
    amsler_left: payload.amsler_left ?? [],
    amsler_right: payload.amsler_right ?? [],
    headache: payload.headache,
    eye_pressure: payload.eye_pressure,
    blur: payload.blur,
    is_baseline: false,
  }
  const entry = addToHistory(member, check) // also counts towards tests_completed
  return { check: checkResponse(entry.check), assessment: entry.assessment }
}

export function trends(auth, id) {
  requireSelfOrMedical(auth, id)
  const member = findMember(id)
  return {
    astronaut: { id: member.id, name: member.name, call_sign: member.call_sign },
    baseline: member.baseline,
    vision: history[member.id].map(({ check, assessment }) => ({
      mission_day: check.mission_day,
      near_vision_left: check.near_vision_left,
      near_vision_right: check.near_vision_right,
      contrast_left: check.contrast_left,
      contrast_right: check.contrast_right,
      level: assessment.level,
    })),
    cabin_co2: cabinLogs.map((l) => ({ mission_day: l.mission_day, co2_mmhg: l.co2_mmhg })),
    daily: dailyLogs[member.id].map(dailyResponse),
    events: generated.events.map((e) => ({ mission_day: e.mission_day, type: e.type, text: e.text })),
  }
}

export function crewOverview(auth) {
  requireMedical(auth)
  const rows = crew.map(crewRow)
  const alerts = rows
    .filter((r) => r.overall === 'RED' || r.overall === 'AMBER' || r.overdue)
    .map((r) => ({
      astronaut_id: r.astronaut_id,
      call_sign: r.call_sign,
      level: r.overall,
      text: r.overdue ? `${r.headline}. Weekly eye test overdue.` : r.headline,
    }))
  const insights = crewInsights().map(({ type, text }) => ({ type, text }))
  return { cabin: cabinSummary(), insights, alerts, crew: rows }
}

export function engagement(auth, id) {
  requireSelfOrMedical(auth, id)
  const member = findMember(id)
  const tests = history[member.id].length
  const streak = member.streak_weeks
  const badges = [
    tests >= 1 && { code: 'FIRST_TEST', earned: true },
    streak >= 4 && { code: 'STREAK_4', earned: true },
    streak >= 12 && { code: 'STREAK_12', earned: true },
  ].filter(Boolean)
  return {
    streak_weeks: streak,
    tests_completed: tests,
    next_test_due: latestEntry(member.id)?.assessment.next_test_due ?? null,
    badges,
  }
}

export function dailyLog(auth, payload) {
  const user = requireUser(auth)
  if (user.astronaut_id !== Number(payload.astronaut)) throw forbidden()
  const member = findMember(payload.astronaut)
  const day = payload.date ? dayOf(payload.date) : TODAY
  const log = {
    id: nextLogId++,
    astronaut: member.id,
    date: payload.date ?? TODAY_DATE,
    mission_day: Number.isFinite(day) ? day : TODAY,
    resting_hr: payload.resting_hr,
    bp_systolic: payload.bp_systolic,
    bp_diastolic: payload.bp_diastolic,
    sleep_hours: payload.sleep_hours,
    mood: payload.mood,
    sodium_mg: payload.sodium_mg,
    exercise_min: payload.exercise_min,
  }
  // One log per day: replace an existing log for the same day.
  const logs = dailyLogs[member.id]
  const index = logs.findIndex((l) => l.mission_day === log.mission_day)
  if (index >= 0) logs[index] = log
  else logs.push(log)

  // Compare each value with the demo normal range.
  const N = CONFIG.normal
  const describe = (label, value, unit, range) => {
    const ok = inRange(value, range)
    const where = ok ? 'in your normal range' : value < range[0] ? 'below your normal range' : 'above your normal range'
    return { level: ok ? 'GREEN' : 'AMBER', text: `${label} ${value}${unit ? ` ${unit}` : ''}: ${where} (${range[0]}-${range[1]}).` }
  }
  const bpOk = inRange(log.bp_systolic, N.bp_systolic) && inRange(log.bp_diastolic, N.bp_diastolic)
  const vitals_status = [
    describe('Resting heart rate', log.resting_hr, 'bpm', N.resting_hr),
    {
      level: bpOk ? 'GREEN' : 'AMBER',
      text: `Blood pressure ${log.bp_systolic}/${log.bp_diastolic}: ${bpOk ? 'in' : 'outside'} your normal range (${N.bp_systolic.join('-')} / ${N.bp_diastolic.join('-')}).`,
    },
    describe('Sleep', log.sleep_hours, 'hours', N.sleep_hours),
    describe('Mood', log.mood, 'out of 5', N.mood),
    describe('Sodium', log.sodium_mg, 'mg', N.sodium_mg),
    describe('Exercise', log.exercise_min, 'min', N.exercise_min),
  ]
  const { mission_day, ...saved } = log // mission_day is internal to the mock
  return { ...saved, vitals_status }
}

export function weeklyReport(auth) {
  requireMedical(auth)
  const fromDay = TODAY - 6
  const rows = crew.map(crewRow)
  const cabin = cabinSummary()
  const week = lastDays(cabinLogs, TODAY, 7)

  const crew_summary = rows.map((r) => {
    const member = findMember(r.astronaut_id)
    const latest = latestEntry(r.astronaut_id)?.check
    return {
      astronaut: r.name,
      call_sign: r.call_sign,
      overall: r.overall,
      eyes: r.eyes,
      near_vision_l_r: latest ? `${latest.near_vision_left} / ${latest.near_vision_right}` : null,
      baseline_l_r: `${member.baseline.near_vision_left} / ${member.baseline.near_vision_right}`,
      tests_this_week: history[r.astronaut_id].filter((h) => h.check.mission_day >= fromDay).length,
      overdue: r.overdue,
      headline: r.headline,
    }
  })

  // Insights: the latest flagged tests' insights plus crew-wide patterns.
  // Only one insight per astronaut + type, so the same pattern is not listed twice.
  const insights = []
  const addInsight = (insight) => {
    const same = (i) => i.type === insight.type && i.call_sign === insight.call_sign
    if (!insights.some(same)) insights.push(insight)
  }
  for (const r of rows) {
    for (const insight of latestEntry(r.astronaut_id)?.assessment.env_insights ?? []) {
      addInsight({ type: insight.type, call_sign: r.call_sign, text: `${r.call_sign}: ${insight.text}` })
    }
  }
  crewInsights().forEach(addInsight)
  const insightsOut = insights.map(({ type, text }) => ({ type, text })) // call_sign was only for de-duplication

  const recommendations_for_surgeon = []
  for (const r of rows) {
    if (r.overall === 'RED') recommendations_for_surgeon.push(`Review ${r.name}'s latest eye test with the Crew Medical Officer (${r.headline.toLowerCase()}).`)
    else if (r.overall === 'AMBER') recommendations_for_surgeon.push(`Check that ${r.name} completes the retest within 48 hours.`)
    if (r.overdue) recommendations_for_surgeon.push(`Remind ${r.name} to complete the overdue weekly eye test.`)
  }
  if (cabin.co2_level !== 'GREEN') recommendations_for_surgeon.push('Confirm that the cabin CO₂ scrubber check has been done.')
  if (!recommendations_for_surgeon.length) recommendations_for_surgeon.push('No action needed this week.')

  return {
    mission: {
      name: mission.name,
      environment: mission.environment,
      mission_day_today: TODAY,
      report_days: `${fromDay}-${TODAY}`,
      start_date: mission.start_date,
      planned_duration_days: mission.planned_duration_days,
    },
    crew_summary,
    environment: {
      co2_today_mmhg: cabin.co2_mmhg_today,
      co2_5day_avg_mmhg: cabin.co2_5day_avg,
      co2_7day_avg_mmhg: Math.round(average(week, 'co2_mmhg') * 100) / 100,
      co2_high_days: week.filter((l) => l.co2_mmhg > CONFIG.insights.co2HighMmhg).length,
      co2_level: cabin.co2_level,
    },
    insights: insightsOut,
    recommendations_for_surgeon,
  }
}
