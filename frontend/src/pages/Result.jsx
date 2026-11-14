import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
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
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [result])

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header backTo={`/astronaut/${id}`} />
        <div className="flex justify-center items-center py-32 text-slate-400 text-sm">
          Loading result…
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header backTo={`/astronaut/${id}`} />
        <div className="flex justify-center items-center py-32 text-slate-400 text-sm">
          No result available.
        </div>
      </div>
    )
  }

  const s = getStatus(result.level)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header backTo={`/astronaut/${id}`} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Badge */}
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Your result today</p>
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <span
              className={`inline-flex items-center px-6 py-3 rounded-2xl text-xl font-black tracking-widest uppercase ${s.bg} text-slate-950`}
            >
              {s.label}
            </span>
          </div>
        </div>

        {result.mission_day != null && (
          <p className="text-center text-slate-500 text-sm -mt-3">
            Mission day {result.mission_day}
          </p>
        )}

        {result.reason && (
          <div className="bg-slate-800/50 rounded-2xl px-5 py-4 border border-slate-700/50">
            <p className="text-slate-300 leading-relaxed text-sm">{result.reason}</p>
          </div>
        )}

        {result.actions?.length > 0 && (
          <div className="bg-slate-900 rounded-2xl px-5 py-4 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">What to do</h3>
            <ul className="flex flex-col gap-3">
              {result.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-200 text-sm">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.bg}`} />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.env_insight && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Environment</p>
            <p className="text-amber-200 text-sm leading-relaxed">{result.env_insight}</p>
          </div>
        )}

        <button
          onClick={() => navigate(`/astronaut/${id}`)}
          className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-base active:scale-95 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  )
}
