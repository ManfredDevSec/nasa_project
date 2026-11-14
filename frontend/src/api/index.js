import client, { ApiError, handleUnauthorized, toApiError } from './client.js'
import { getToken, getUser } from '../utils/auth.js'

export { ApiError }

// Pages only ever call the functions in this file.
//
// ── Live or mock, per area ───────────────────────────────────────────────────
// The backend goes live one area at a time, so each endpoint belongs to an area and
// VITE_LIVE_AREAS lists the areas that use the real API (everything else uses src/mocks):
//   VITE_LIVE_AREAS=auth                 -> login, password, profile and user management are real
//   VITE_LIVE_AREAS=auth,crew,checks     -> add areas as the backend announces them
//   VITE_LIVE_AREAS=all                  -> everything is real
//   VITE_LIVE_AREAS=                     -> everything is mocked (offline demo)
// If VITE_LIVE_AREAS is not set at all, the older VITE_USE_MOCKS switch still works
// ("true" = all mocked, "false" = all real, or a list of mocked endpoint names).
const AREA_OF = {
  login: 'auth',
  logout: 'auth',
  getMe: 'auth',
  updateMe: 'auth',
  changePassword: 'auth',
  requestPasswordReset: 'auth',
  confirmPasswordReset: 'auth',
  listUsers: 'auth',
  getUserById: 'auth',
  createUser: 'auth',
  updateUser: 'auth',
  deactivateUser: 'auth',
  getActiveMission: 'crew',
  getBodyMap: 'bodyMap',
  submitCheck: 'checks',
  getTrends: 'trends',
  getCrewOverview: 'overview',
  getWeeklyReport: 'report',
  getEngagement: 'engagement',
  postDailyLog: 'dailyLogs',
}

const LIVE_SETTING = import.meta.env.VITE_LIVE_AREAS
const LIVE_AREAS = new Set(
  String(LIVE_SETTING ?? '')
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean),
)
const MOCK_SETTING = String(import.meta.env.VITE_USE_MOCKS ?? 'false').trim()
const MOCK_KEYS = new Set(MOCK_SETTING.split(',').map((key) => key.trim()).filter(Boolean))
const MOCK_DELAY_MS = 300

export function isMocked(fnName) {
  if (LIVE_SETTING !== undefined) {
    if (LIVE_AREAS.has('all')) return false
    return !LIVE_AREAS.has(AREA_OF[fnName] ?? fnName)
  }
  // Older switch: VITE_USE_MOCKS
  if (MOCK_SETTING === 'true') return true
  if (MOCK_SETTING === 'false' || MOCK_SETTING === '') return false
  const withoutVerb = fnName.replace(/^(get|post)(?=[A-Z])/, '')
  const shortKey = withoutVerb[0].toLowerCase() + withoutVerb.slice(1)
  return MOCK_KEYS.has(fnName) || MOCK_KEYS.has(shortKey)
}

// ── "DEMO DATA" chip support ────────────────────────────────────────────────
// We remember which screens (URL paths) used at least one mocked endpoint.
const mockedPaths = new Set()
const listeners = new Set()

export function subscribeToMockUsage(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function currentScreenUsedMocks() {
  return mockedPaths.has(window.location.pathname)
}

// Run a handler from the fake backend after a short fake network delay.
// The handler gets the same token the real API would get in the Authorization header,
// so the mock can answer 401 / 403 exactly like the server, with the same error shape.
// The store is loaded on first use, so it is never downloaded when mocks are off.
async function runMock(handler, { isLoginCall = false } = {}) {
  const path = window.location.pathname
  if (!mockedPaths.has(path)) {
    mockedPaths.add(path)
    listeners.forEach((notify) => notify())
  }
  const store = await import('../mocks/store.js')
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
  try {
    return structuredClone(handler(store, { token: getToken(), user: getUser() })) // a copy, so pages cannot change the store
  } catch (error) {
    const apiError = toApiError(error)
    handleUnauthorized(apiError, { isLoginCall }) // same 401 behaviour as the axios interceptor
    throw apiError
  }
}

// ── auth (live) ──────────────────────────────────────────────────────────────

/** POST /auth/login/ -> { token, user } (user has email, first_name, last_name too) */
export async function login(username, password) {
  if (isMocked('login')) return runMock((m) => m.login(username, password), { isLoginCall: true })
  const { data } = await client.post('/auth/login/', { username, password })
  return data
}

/** POST /auth/logout/ -> 204, no body. The token stops working on every device. */
export async function logout() {
  if (isMocked('logout')) return runMock((m, auth) => m.logout(auth))
  await client.post('/auth/logout/')
  return null
}

/** GET /auth/me/ -> the current user (same shape as at login) */
export async function getMe() {
  if (isMocked('getMe')) return runMock((m, auth) => m.me(auth))
  const { data } = await client.get('/auth/me/')
  return data
}

/** PATCH /auth/me/ with any of email, first_name, last_name -> the updated user */
export async function updateMe(changes) {
  if (isMocked('updateMe')) return runMock((m, auth) => m.updateMe(auth, changes))
  const { data } = await client.patch('/auth/me/', changes)
  return data
}

/** POST /auth/password/change/ -> { token } (the old token stops working at once) */
export async function changePassword(oldPassword, newPassword) {
  const body = { old_password: oldPassword, new_password: newPassword }
  if (isMocked('changePassword')) return runMock((m, auth) => m.changePassword(auth, body))
  const { data } = await client.post('/auth/password/change/', body)
  return data
}

/** POST /auth/password/reset/ -> always 200 { detail }, whether or not the email exists */
export async function requestPasswordReset(email) {
  if (isMocked('requestPasswordReset')) return runMock((m) => m.passwordReset(email))
  const { data } = await client.post('/auth/password/reset/', { email })
  return data
}

/** POST /auth/password/reset/confirm/ (also used to choose a first password from an invite) */
export async function confirmPasswordReset(uid, token, newPassword) {
  const body = { uid, token, new_password: newPassword }
  if (isMocked('confirmPasswordReset')) return runMock((m) => m.passwordResetConfirm(body))
  const { data } = await client.post('/auth/password/reset/confirm/', body)
  return data
}

// ── user management (ADMIN only; everyone else gets 403) ────────────────────

/** GET /auth/users/?role=&is_active=&search= (all filters optional) */
export async function listUsers(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
  if (isMocked('listUsers')) return runMock((m, auth) => m.listUsers(auth, params))
  const { data } = await client.get('/auth/users/', { params })
  return data
}

/** GET /auth/users/{id}/ */
export async function getUserById(id) {
  if (isMocked('getUserById')) return runMock((m, auth) => m.getUserById(auth, id))
  const { data } = await client.get(`/auth/users/${id}/`)
  return data
}

/** POST /auth/users/ (leave password out to email the person an invite instead) */
export async function createUser(payload) {
  if (isMocked('createUser')) return runMock((m, auth) => m.createUser(auth, payload))
  const { data } = await client.post('/auth/users/', payload)
  return data
}

/** PATCH /auth/users/{id}/ (anything, including is_active and password) */
export async function updateUser(id, changes) {
  if (isMocked('updateUser')) return runMock((m, auth) => m.updateUser(auth, id, changes))
  const { data } = await client.patch(`/auth/users/${id}/`, changes)
  return data
}

/** DELETE /auth/users/{id}/ -> 204. Deactivates; re-enable with updateUser(id, { is_active: true }). */
export async function deactivateUser(id) {
  if (isMocked('deactivateUser')) return runMock((m, auth) => m.deactivateUser(auth, id))
  await client.delete(`/auth/users/${id}/`)
  return null
}

// ── mission data (mocked until the backend announces each area) ─────────────

/** GET /missions/active/ */
export async function getActiveMission() {
  if (isMocked('getActiveMission')) return runMock((m, auth) => m.activeMission(auth))
  const { data } = await client.get('/missions/active/')
  return data
}

/** GET /astronauts/{id}/body-map/ */
export async function getBodyMap(astronautId) {
  if (isMocked('getBodyMap')) return runMock((m, auth) => m.bodyMap(auth, astronautId))
  const { data } = await client.get(`/astronauts/${astronautId}/body-map/`)
  return data
}

/** POST /checks/ -> { check, assessment } */
export async function submitCheck(payload) {
  if (isMocked('submitCheck')) return runMock((m, auth) => m.submitCheck(auth, payload))
  const { data } = await client.post('/checks/', payload)
  return data
}

/** GET /astronauts/{id}/trends/ */
export async function getTrends(astronautId) {
  if (isMocked('getTrends')) return runMock((m, auth) => m.trends(auth, astronautId))
  const { data } = await client.get(`/astronauts/${astronautId}/trends/`)
  return data
}

/** GET /crew/overview/ */
export async function getCrewOverview() {
  if (isMocked('getCrewOverview')) return runMock((m, auth) => m.crewOverview(auth))
  const { data } = await client.get('/crew/overview/')
  return data
}

/** GET /reports/weekly/ */
export async function getWeeklyReport() {
  if (isMocked('getWeeklyReport')) return runMock((m, auth) => m.weeklyReport(auth))
  const { data } = await client.get('/reports/weekly/')
  return data
}

/** GET /astronauts/{id}/engagement/ */
export async function getEngagement(astronautId) {
  if (isMocked('getEngagement')) return runMock((m, auth) => m.engagement(auth, astronautId))
  const { data } = await client.get(`/astronauts/${astronautId}/engagement/`)
  return data
}

/** POST /daily-logs/ -> the saved log including vitals_status */
export async function postDailyLog(payload) {
  if (isMocked('postDailyLog')) return runMock((m, auth) => m.dailyLog(auth, payload))
  const { data } = await client.post('/daily-logs/', payload)
  return data
}

// ── error helpers (every error is an ApiError; see client.js) ───────────────

// 409 NO_BASELINE: the astronaut has no baseline tests to compare with.
export const isNoBaseline = (error) => error?.code === 'NO_BASELINE'
export const isForbidden = (error) => error?.status === 403

// One readable sentence for any error, following the table in the API notes.
const MESSAGE_FOR_CODE = {
  INVALID_CREDENTIALS: 'Wrong username or password.',
  THROTTLED: 'Too many attempts. Wait a minute.',
  PERMISSION_DENIED: "You don't have access to this.",
  NO_BASELINE: 'Do your baseline tests first. Ask the Medical Officer to record them.',
  NETWORK_ERROR: 'Cannot reach the Sightline server. Check the connection and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
}

export function getErrorMessage(error) {
  if (!error) return ''
  const apiError = toApiError(error)
  if (MESSAGE_FOR_CODE[apiError.code]) return MESSAGE_FOR_CODE[apiError.code]
  return apiError.field('non_field_errors') ?? apiError.message ?? 'Something went wrong. Please try again.'
}
