import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'
import TrendChart from '../components/TrendChart'
import { getMission, getAstronauts, getHistory } from '../api/client'

const LEVEL_RANK = { RED: 2, AMBER: 1, GREEN: 0 }

function computeNearChange(checks) {
  if (!checks || checks.length < 2) return null
  const last = checks[checks.length - 1]?.near_vision
  const prev = checks[checks.length - 2]?.near_vision
  if (last == null || prev == null) return null
  return Math.round((last - prev) / 0.1)
}

function NearChangePill({ checks }) {
  const lines = computeNearChange(checks)
  if (lines == null) return <span className="text-xs text-slate-500">—</span>
  if (lines === 0) return <span className="text-xs text-slate-400">stable</span>
  if (lines > 0)
    return (
      <span className="text-xs font-semibold text-amber-400">
        ↓{lines} line{lines !== 1 ? 's' : ''}
      </span>
    )
  return (
    <span className="text-xs font-semibold text-emerald-400">
      ↑{Math.abs(lines)} line{Math.abs(lines) !== 1 ? 's' : ''}
    </span>
  )
}

export default function CrewDashboard() {
  const navigate = useNavigate()
  const [mission, setMission] = useState(null)
  const [astronauts, setAstronauts] = useState([])
  const [histories, setHistories] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [missionData, crew] = await Promise.all([getMission(), getAstronauts()])
        if (cancelled) return
        setMission(missionData)
        setAstronauts(crew)

        const hists = await Promise.all(crew.map(a => getHistory(a.id)))
        if (cancelled) return

        const map = {}
        let worstId = null
        let worstRank = -1
        crew.forEach((a, i) => {
          map[a.id] = hists[i]
          const checks = hists[i]?.checks ?? []
          const level = checks[checks.length - 1]?.status?.level
          const rank = LEVEL_RANK[level] ?? 0
          if (rank > worstRank) {
            worstRank = rank
            worstId = a.id
          }
        })

        setHistories(map)
        setSelectedId(worstId ?? crew[0]?.id ?? null)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header backTo="/" />
      <Loading label="Loading crew data…" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header backTo="/" />
      <ErrorBox error={error} onRetry={() => window.location.reload()} />
    </div>
  )

  const selectedHistory = selectedId ? histories[selectedId] : null
  const selectedChecks = selectedHistory?.checks ?? []
  const selectedEnv = selectedHistory?.env ?? []
  const latestCheck = selectedChecks[selectedChecks.length - 1]
  const envInsight = latestCheck?.status?.env_insight

  const co2Value = mission?.today_env?.co2_mmhg
  const co2High = mission?.co2_high

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header backTo="/" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Mission header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-black tracking-tight">
            Mission Day {mission?.mission_day ?? '—'}
          </h1>
          {co2Value != null && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                co2High
                  ? 'bg-red-950 text-red-400 ring-1 ring-red-700'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {co2High && <span>▲</span>}
              CO₂{co2High ? ' HIGH' : ''} {co2Value} mmHg
            </span>
          )}
        </div>

        {/* Crew cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {astronauts.map(a => {
            const hist = histories[a.id]
            const checks = hist?.checks ?? []
            const level = checks[checks.length - 1]?.status?.level
            const isSelected = a.id === selectedId
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`flex flex-col items-start gap-2 p-4 rounded-2xl shrink-0 w-40 transition-all text-left ${
                  isSelected
                    ? 'bg-slate-700 ring-2 ring-indigo-500'
                    : 'bg-slate-800 hover:bg-slate-750'
                }`}
              >
                <p className="font-bold text-sm leading-tight">{a.name}</p>
                {level && <StatusBadge level={level} />}
                <NearChangePill checks={checks} />
              </button>
            )
          })}
        </div>

        {/* Trend chart */}
        {selectedHistory && (
          <TrendChart
            checks={selectedChecks}
            env={selectedEnv}
            thresholds={mission?.thresholds ?? {}}
          />
        )}

        {/* Env insight */}
        {envInsight && (
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4 flex gap-3">
            <span className="text-lg shrink-0">💡</span>
            <p className="text-sm text-slate-300 leading-relaxed">{envInsight}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('/report')}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 active:scale-95 transition-all"
          >
            Generate Earth Report
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all"
          >
            Back to crew select
          </button>
        </div>
      </div>
    </div>
  )
}
