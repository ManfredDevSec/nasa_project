import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { getAstronaut } from '../api/client'
import { getStatus } from '../lib/status'

export default function Result() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [result, setResult] = useState(state?.result ?? null)
  const [fetchLoading, setFetchLoading] = useState(!state?.result)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (result) return
    getAstronaut(id)
      .then(a => setResult(a.latest_status ?? null))
      .catch(() => {})
      .finally(() => setFetchLoading(false))
  }, [])

  useEffect(() => {
    if (!result) return
    const rafId = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(rafId)
  }, [result])

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <Header backTo={`/astronaut/${id}`} />
        <div className="flex justify-center items-center py-32 font-mono text-sm text-muted">
          Loading result…
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <Header backTo={`/astronaut/${id}`} />
        <div className="flex justify-center items-center py-32 font-mono text-sm text-muted">
          No result available.
        </div>
      </div>
    )
  }

  const s = getStatus(result.level)

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header backTo={`/astronaut/${id}`} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Status word */}
        <div
          className="pt-4 pb-2"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}
        >
          <p className="font-mono text-xs text-dim mb-1">Today's result</p>
          <p className="text-4xl font-semibold" style={{ color: s.hex }}>{s.label}</p>
          {result.mission_day != null && (
            <p className="font-mono text-sm text-dim mt-2">
              MD {String(result.mission_day).padStart(3, '0')}
            </p>
          )}
        </div>

        {result.reason && (
          <p className="text-muted leading-relaxed" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            {result.reason}
          </p>
        )}

        {result.actions?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted mb-2">What to do</p>
            <ol className="flex flex-col gap-2">
              {result.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted">
                  <span className="font-mono text-dim shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {result.env_insight && (
          <div
            className="pl-4 py-2 text-sm text-muted leading-relaxed"
            style={{ borderLeft: '3px solid var(--watch)' }}
          >
            {result.env_insight}
          </div>
        )}

        <button
          onClick={() => navigate(`/astronaut/${id}`)}
          className="w-full py-4 text-sm font-medium transition-opacity duration-150 hover:opacity-90 mt-2"
          style={{ backgroundColor: 'var(--ink)', color: 'var(--bg)' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
