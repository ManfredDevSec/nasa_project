// Keeps the last eye-test result in sessionStorage so /result survives a page refresh.
const KEY = 'sightline_last_result'

// `state` is { result: { check, assessment }, testsBefore }.
export function saveLastResult(state) {
  sessionStorage.setItem(KEY, JSON.stringify(state))
}

export function readLastResult() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}
