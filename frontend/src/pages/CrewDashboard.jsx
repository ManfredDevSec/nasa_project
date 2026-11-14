import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'
import TrendChart from '../components/TrendChart'
import Button from '../components/Button'
import { getMission, getAstronauts, getHistory } from '../api/client'
import { fmt } from '../lib/format'

const LEVEL_RANK = { RED: 2, AMBER: 1, GREEN: 0 }
const STATUS_COLORS = { GREEN: '#6fae7c', AMBER: '#d9a441', RED: '#d0604f' }

function toSentenceCase(str) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function computeNearChange(checks) {
  if (!checks || checks.length < 2) return null
  const baseline = checks[0]?.near_vision
  const latest = checks[checks.length - 1]?.near_vision
  if (baseline == null || latest == null) return null
  return Math.round((latest - baseline) / 0.1)
}

function NearChangePill({ checks, statusLevel }) {
  const lines = computeNearChange(checks)
  const statusColor = STATUS_COLORS[statusLevel] ?? 'var(--dim)'

  if (lines == null) return <span className="font-mono text-xs" style={{ color: 'var(--dim)' }}>—</span>
  if (lines === 0) return <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Same as baseline</span>
  if (lines > 0)
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: statusColor }}>
        <TrendingDown size={11} strokeWidth={1.5} />
        {lines} line{lines !== 1 ? 's' : ''} worse
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--ok)' }}>
      <TrendingUp size={11} strokeWidth={1.5} />
      {Math.abs(lines)} line{Math.abs(lines) !== 1 ? 's' : ''} better
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
    <div className="min-h-screen bg-bg text-ink">
      <Header backTo="/" />
      <Loading label="Loading crew data…" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg text-ink">
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
    <div className="min-h-screen bg-bg text-ink">
      <Header backTo="/" />

      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-5 space-y-5">

        {/* Top strip */}
        <div
          className="flex flex-wrap gap-6 py-3 font-mono text-sm"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span>
            <span style={{ color: 'var(--dim)' }}>Mission day</span>{' '}
            <span style={{ color: 'var(--text)' }}>{mission?.mission_day ?? '—'}</span>
          </span>
          {co2Value != null && (
            <span>
              <span style={{ color: 'var(--dim)' }}>CO₂</span>{' '}
              <span style={{ color: co2High ? 'var(--alert)' : 'var(--text)' }}>
                {fmt(co2Value, 1)} mmHg
              </span>
              {co2High && <span style={{ color: 'var(--alert)' }}> High</span>}
            </span>
          )}
          <span>
            <span style={{ color: 'var(--dim)' }}>Crew</span>{' '}
            <span style={{ color: 'var(--text)' }}>{astronauts.length}</span>
          </span>
        </div>

        {/* Crew list */}
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {astronauts.map(a => {
            const hist = histories[a.id]
            const checks = hist?.checks ?? []
            const level = checks[checks.length - 1]?.status?.level
            const isSelected = a.id === selectedId
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="flex items-center gap-4 w-full py-3 text-left transition-colors duration-150"
                style={{
                  borderBottom: '1px solid var(--line)',
                  backgroundColor: isSelected ? '#1d1e19' : 'transparent',
                }}
              >
                <div
                  style={{
                    width: 2,
                    height: 28,
                    flexShrink: 0,
                    backgroundColor: isSelected ? 'var(--text)' : 'transparent',
                    transition: 'background-color 150ms',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>{toSentenceCase(a.role)}</p>
                </div>
                <StatusBadge level={level} />
                <NearChangePill checks={checks} statusLevel={level} />
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
          <div
            className="pl-4 py-2 text-sm leading-relaxed"
            style={{ borderLeft: '3px solid var(--watch)', color: 'var(--text)' }}
          >
            {envInsight}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={() => navigate('/report')} className="flex-1">
            Generate weekly report
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">
            Crew select
          </Button>
        </div>
      </div>
    </div>
  )
}
