import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'
import { getWeeklyReport } from '../api/client'

function formatNearChange(lines) {
  if (lines == null) return '—'
  if (lines === 0) return 'stable'
  return lines > 0
    ? `↓${lines} line${lines !== 1 ? 's' : ''}`
    : `↑${Math.abs(lines)} line${Math.abs(lines) !== 1 ? 's' : ''}`
}

function formatContrastChange(val) {
  if (val == null) return '—'
  if (val === 0) return 'stable'
  return val > 0 ? `+${val}%` : `${val}%`
}

function Sparkline({ history = [] }) {
  if (!history.length) return <span className="text-gray-400 text-xs">—</span>
  return (
    <ResponsiveContainer width={100} height={36}>
      <LineChart data={history}>
        <YAxis reversed hide domain={['auto', 'auto']} />
        <Line
          type="monotone"
          dataKey="near_vision"
          stroke="#6366f1"
          strokeWidth={1.5}
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
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-gray-500">{label}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`,
          gap: 1,
          backgroundColor: '#9ca3af',
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
                  ? '#6b7280'
                  : marked.has(`${r},${c}`)
                  ? '#f59e0b'
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
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">
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
    <div className="min-h-screen bg-slate-950 text-white">
      <Loading label="Generating report…" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-950 text-white">
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

      {/* App nav — hidden when printing */}
      <div className="no-print min-h-screen bg-slate-950">
        <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-800">
          <button
            onClick={() => navigate('/crew')}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-2xl font-black tracking-tight text-white">SightLine</span>
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

      {/* Print-only wrapper — this is what appears on the printed page */}
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
    <div className="bg-white text-gray-900 rounded-2xl max-w-3xl mx-auto p-8 shadow-2xl">
      {/* Title block */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">
          SightLine — Weekly Crew Vision Report
        </h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
          <span>Mission Day {mission_day ?? '—'}</span>
          {period && (
            <span>Period: {period.start} – {period.end}</span>
          )}
          {generated_at && (
            <span>Generated: {new Date(generated_at).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Crew summary table */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3 uppercase tracking-wide text-xs">Crew Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left pb-2 pr-4 font-semibold">Name</th>
                <th className="text-left pb-2 pr-4 font-semibold">Role</th>
                <th className="text-left pb-2 pr-4 font-semibold">Status</th>
                <th className="text-right pb-2 pr-4 font-semibold">Near</th>
                <th className="text-right pb-2 pr-4 font-semibold">Contrast</th>
                <th className="text-right pb-2 pr-4 font-semibold">Tests</th>
                <th className="text-left pb-2 font-semibold">Trend</th>
                <th className="text-left pb-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {crew.map(m => (
                <tr key={m.id} className="border-b border-gray-100 align-middle">
                  <td className="py-2 pr-4 font-semibold">{m.name}</td>
                  <td className="py-2 pr-4 text-gray-500">{m.role ?? '—'}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge level={latestStatus(m)} />
                  </td>
                  <td className={`py-2 pr-4 text-right font-mono text-xs ${
                    (m.near_change_lines ?? 0) > 0 ? 'text-amber-600' :
                    (m.near_change_lines ?? 0) < 0 ? 'text-emerald-600' : 'text-gray-500'
                  }`}>
                    {formatNearChange(m.near_change_lines)}
                  </td>
                  <td className={`py-2 pr-4 text-right font-mono text-xs ${
                    (m.contrast_change ?? 0) < 0 ? 'text-amber-600' :
                    (m.contrast_change ?? 0) > 0 ? 'text-emerald-600' : 'text-gray-500'
                  }`}>
                    {formatContrastChange(m.contrast_change)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600">{m.checks_in_period ?? '—'}</td>
                  <td className="py-2 pr-4">
                    <Sparkline history={m.history ?? []} />
                  </td>
                  <td className="py-2 text-xs text-gray-500 max-w-xs">{statusReason(m) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Amsler grids */}
      {crewWithAmsler.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Amsler Grid Marks</h2>
          <div className="flex flex-wrap gap-6">
            {crewWithAmsler.map(m => (
              <div key={m.id} className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-700">{m.name}</p>
                <div className="flex gap-3">
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
        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Environment — Period Summary</h2>
          <div className="grid grid-cols-2 gap-x-8 rounded-xl border border-gray-200 p-4">
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
        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Insights</h2>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-gray-400 shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Print button */}
      <div className="no-print border-t border-gray-200 pt-6 mt-2">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 active:scale-95 transition-all"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400 leading-relaxed">
        Screening aid only — not a diagnosis. Thresholds are demo values pending review by NASA medical experts.
      </p>
    </div>
  )
}
