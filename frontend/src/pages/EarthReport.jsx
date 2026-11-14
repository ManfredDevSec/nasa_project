import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'
import { getWeeklyReport } from '../api/client'

function formatNearChange(lines) {
  if (lines == null) return '—'
  if (lines === 0) return 'Stable'
  return lines > 0
    ? `-${lines} line${lines !== 1 ? 's' : ''}`
    : `+${Math.abs(lines)} line${Math.abs(lines) !== 1 ? 's' : ''}`
}

function formatContrastChange(val) {
  if (val == null) return '—'
  if (val === 0) return 'Stable'
  return val > 0 ? `+${val}%` : `${val}%`
}

function Sparkline({ history = [] }) {
  if (!history.length) return <span style={{ color: '#6b7280', fontSize: 12 }}>—</span>
  return (
    <ResponsiveContainer width={100} height={36}>
      <LineChart data={history}>
        <YAxis reversed hide domain={['auto', 'auto']} />
        <Line
          type="monotone"
          dataKey="near_vision"
          stroke="#9ca3af"
          strokeWidth={1.25}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function MiniAmsler({ marks = [], label }) {
  const SIZE = 10
  const CELL = 7
  const marked = new Set(
    marks.map(([r, c]) => `${Math.floor(r / 2)},${Math.floor(c / 2)}`)
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <p style={{ fontSize: 10, color: '#6b7280' }}>{label}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`,
          gap: 1,
          backgroundColor: '#d1d5db',
          padding: 1,
        }}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE)
          const c = i % SIZE
          const isCenter = r === 4 && c === 4
          return (
            <div
              key={i}
              style={{
                width: CELL,
                height: CELL,
                backgroundColor: isCenter
                  ? '#9ca3af'
                  : marked.has(`${r},${c}`)
                  ? '#d97706'
                  : 'white',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function EnvRow({ label, value, unit = '' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: '#111827' }}>
        {value != null ? `${value}${unit}` : '—'}
      </span>
    </div>
  )
}

export default function EarthReport() {
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getWeeklyReport()
      .then(data => { if (!cancelled) { setReport(data); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-bg text-ink">
      <Loading label="Generating report…" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg text-ink">
      <ErrorBox error={error} onRetry={() => window.location.reload()} />
    </div>
  )

  const { generated_at, mission_day, period, crew = [], environment, insights = [] } = report

  const crewWithAmsler = crew.filter(
    m => m.latest_amsler?.left?.length > 0 || m.latest_amsler?.right?.length > 0
  )

  const latestStatus = m =>
    typeof m.latest_status === 'string' ? m.latest_status : m.latest_status?.level

  const statusReason = m =>
    typeof m.latest_status === 'object' ? m.latest_status?.reason : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      <div className="no-print min-h-screen bg-bg">
        <div
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <button
            onClick={() => navigate('/crew')}
            className="flex items-center justify-center w-10 h-10 text-muted hover:text-ink transition-colors duration-150"
            aria-label="Back"
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <span className="font-mono text-xs tracking-[0.2em] text-ink">SIGHTLINE</span>
        </div>

        <div className="px-4 py-6">
          <ReportDocument
            generated_at={generated_at}
            mission_day={mission_day}
            period={period}
            crew={crew}
            environment={environment}
            insights={insights}
            crewWithAmsler={crewWithAmsler}
            latestStatus={latestStatus}
            statusReason={statusReason}
          />
        </div>
      </div>

      <div className="hidden print:block">
        <ReportDocument
          generated_at={generated_at}
          mission_day={mission_day}
          period={period}
          crew={crew}
          environment={environment}
          insights={insights}
          crewWithAmsler={crewWithAmsler}
          latestStatus={latestStatus}
          statusReason={statusReason}
        />
      </div>
    </>
  )
}

function ReportDocument({ generated_at, mission_day, period, crew, environment, insights, crewWithAmsler, latestStatus, statusReason }) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        color: '#111827',
        maxWidth: 768,
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}
    >
      {/* Document header block */}
      <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: '#9ca3af', marginBottom: 4 }}>
              SIGHTLINE · WEEKLY VISION REPORT
            </p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>Crew vision status</p>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
            <p>Prepared by: SightLine onboard</p>
            {generated_at && <p>{new Date(generated_at).toLocaleString()}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6b7280' }}>
          <span>Mission day: {mission_day ?? '—'}</span>
          {period && <span>Period: {period.start} – {period.end}</span>}
        </div>
      </div>

      {/* Crew summary table */}
      <section style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
          CREW SUMMARY
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: 11 }}>
                <th style={{ textAlign: 'left', paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>Name</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>Role</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'right', paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>Near</th>
                <th style={{ textAlign: 'right', paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>Contrast</th>
                <th style={{ textAlign: 'right', paddingBottom: 8, paddingRight: 16, fontWeight: 600 }}>Tests</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>Trend</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {crew.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                  <td style={{ padding: '8px 16px 8px 0', fontWeight: 500 }}>{m.name}</td>
                  <td style={{ padding: '8px 16px 8px 0', color: '#6b7280' }}>{m.role ?? '—'}</td>
                  <td style={{ padding: '8px 16px 8px 0' }}>
                    <StatusBadge level={latestStatus(m)} />
                  </td>
                  <td style={{
                    padding: '8px 16px 8px 0',
                    textAlign: 'right',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 12,
                    color: (m.near_change_lines ?? 0) > 0 ? '#d97706' :
                      (m.near_change_lines ?? 0) < 0 ? '#059669' : '#6b7280',
                  }}>
                    {formatNearChange(m.near_change_lines)}
                  </td>
                  <td style={{
                    padding: '8px 16px 8px 0',
                    textAlign: 'right',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 12,
                    color: (m.contrast_change ?? 0) < 0 ? '#d97706' :
                      (m.contrast_change ?? 0) > 0 ? '#059669' : '#6b7280',
                  }}>
                    {formatContrastChange(m.contrast_change)}
                  </td>
                  <td style={{ padding: '8px 16px 8px 0', textAlign: 'right', color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
                    {m.checks_in_period ?? '—'}
                  </td>
                  <td style={{ padding: '8px 16px 8px 0' }}>
                    <Sparkline history={m.history ?? []} />
                  </td>
                  <td style={{ padding: '8px 0', fontSize: 12, color: '#6b7280', maxWidth: 200 }}>
                    {statusReason(m) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Amsler grids */}
      {crewWithAmsler.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
            AMSLER GRID MARKS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {crewWithAmsler.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{m.name}</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <MiniAmsler marks={m.latest_amsler?.left ?? []} label="L" />
                  <MiniAmsler marks={m.latest_amsler?.right ?? []} label="R" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Environment summary */}
      {environment && (
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
            ENVIRONMENT — PERIOD SUMMARY
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '2rem', border: '1px solid #e5e7eb', padding: '1rem' }}>
            <EnvRow label="Average CO₂" value={environment.avg_co2_mmhg} unit=" mmHg" />
            <EnvRow label="Peak CO₂" value={environment.max_co2_mmhg} unit=" mmHg" />
            <EnvRow label="High CO₂ days" value={environment.high_co2_days} />
            <EnvRow label="Average sodium" value={environment.avg_sodium_mg} unit=" mg/day" />
            <EnvRow label="Average exercise" value={environment.avg_exercise_min} unit=" min/day" />
          </div>
        </section>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
            INSIGHTS
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.map((insight, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151' }}>
                <span style={{ color: '#9ca3af', flexShrink: 0 }}>–</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Print button */}
      <div className="no-print" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 20px',
            backgroundColor: '#111827',
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Footer */}
      <p style={{ marginTop: '1.5rem', fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
        Screening aid only — not a diagnosis. Thresholds are demo values pending review by NASA medical experts.
      </p>
    </div>
  )
}
