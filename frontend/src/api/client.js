const BASE = import.meta.env.VITE_API_URL

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body.detail ?? body.message ?? JSON.stringify(body)
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const getAstronauts = () => request('/astronauts/')
export const getAstronaut = (id) => request(`/astronauts/${id}/`)
export const getHistory = (id) => request(`/astronauts/${id}/history/`)
export const submitCheck = (body) =>
  request('/checks/', { method: 'POST', body: JSON.stringify(body) })
export const getMission = () => request('/mission/')
export const getWeeklyReport = (end) =>
  request(`/report/weekly/${end ? `?end=${end}` : ''}`)
export const getEnv = (from, to) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return request(`/env/?${params}`)
}
