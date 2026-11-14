// Small helpers around localStorage so no page touches storage keys directly.
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// Roles that take the weekly eye test (the Medical Officer is also a crew member).
export const CREW_ROLES = ['CREW', 'MEDICAL_OFFICER']
// Roles that may open the crew dashboard and the Earth report.
export const MEDICAL_ROLES = ['MEDICAL_OFFICER', 'FLIGHT_SURGEON', 'ADMIN']

// /home and /test need an astronaut record. A flight surgeon has astronaut_id = null.
export function isAstronaut(user) {
  return !!user && user.astronaut_id != null && CREW_ROLES.includes(user.role)
}

export function canSeeCrew(user) {
  return !!user && MEDICAL_ROLES.includes(user.role)
}

export function isAdmin(user) {
  return user?.role === 'ADMIN'
}

// One place for "who may do what" (API notes, section 9). Hiding things is for a clean
// experience only; the backend enforces the same rules and answers 403 otherwise.
export const can = {
  ownHealth: (user) => isAstronaut(user), // /home, /test, vitals
  crewDashboard: (user) => canSeeCrew(user), // /crew, /report
  viewTrends: (user, astronautId) => canSeeCrew(user) || user?.astronaut_id === Number(astronautId),
  manageUsers: (user) => isAdmin(user), // /admin/users
}

// Where each user lands after logging in: astronauts -> /home; flight surgeon and admin -> /crew.
export function homePathFor(user) {
  if (!user) return '/login'
  if (isAstronaut(user)) return '/home'
  if (canSeeCrew(user)) return '/crew'
  return '/learn' // e.g. a crew account that is not linked to an astronaut yet
}

export const ROLE_LABELS = {
  CREW: 'Crew',
  MEDICAL_OFFICER: 'Medical Officer',
  FLIGHT_SURGEON: 'Flight Surgeon',
  ADMIN: 'Admin',
}
