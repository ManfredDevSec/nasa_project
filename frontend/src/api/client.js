import axios from 'axios'
import { clearSession, getToken } from '../utils/auth.js'

// One shared axios instance. Every real network call goes through here.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach the saved login token to every request (Django REST Framework style).
client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Token ${token}`
  return config
})

/**
 * Every failed call, real or mocked, becomes an ApiError with the backend's one error shape:
 *   { status, code, message, details }   (see the API notes, section 2)
 * `details` maps a form field to its list of messages; use `error.field('new_password')`.
 */
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details ?? {}
  }

  /** First message for a form field (or 'non_field_errors'), or undefined. */
  field(name) {
    return this.details?.[name]?.[0]
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) return error
  const status = error?.response?.status ?? 0
  const body = error?.response?.data?.error
  return new ApiError({
    status,
    code: body?.code ?? (status ? 'UNKNOWN' : 'NETWORK_ERROR'),
    message: body?.message ?? (status ? 'Something went wrong.' : "Can't reach the server."),
    details: body?.details ?? {},
  })
}

// 401 = no token, a bad token, or an expired one (tokens last 7 days): forget it and go to
// the login page, which then says the session expired. Not for the login call itself, where
// a 401 would just mean the attempt failed. Shared with the mock layer so both behave the same.
export function handleUnauthorized(apiError, { isLoginCall = false } = {}) {
  if (apiError?.status === 401 && !isLoginCall && getToken()) {
    clearSession()
    window.location.assign(`${import.meta.env.BASE_URL}login?expired=1`)
  }
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    handleUnauthorized(apiError, { isLoginCall: String(error?.config?.url ?? '').includes('/auth/login/') })
    return Promise.reject(apiError)
  },
)

export default client
