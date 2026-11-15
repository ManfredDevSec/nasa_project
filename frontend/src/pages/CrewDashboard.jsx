import { Link } from 'react-router-dom'
import { getActiveMission, getCrewOverview } from '../api/index.js'
import CrewCard, { eyeLevelOf } from '../components/CrewCard.jsx'
import { ArrowRightIcon, PrinterIcon, WindIcon } from '../components/Icons.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { INSIGHT_CAPTION } from '../content/learn.js'
import { sortBySeverity } from '../utils/status.js'
import { useApi } from '../utils/useApi.js'

export default function CrewDashboard() {
  const { data, loading, error, reload } = useApi(() =>
    Promise.all([getCrewOverview(), getActiveMission().catch(() => null)]),
  )

  if (loading) return <LoadingState label="Loading crew overview…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const [overview, mission] = data
  // Sightline is about the eyes (SANS) only, so status, sorting and alerts use the eye level.
  const rows = overview.crew ?? []
  const rowById = Object.fromEntries(rows.map((r) => [r.astronaut_id, r]))
  const alerts = sortBySeverity(
    (overview.alerts ?? [])
      .map((a) => ({ ...a, level: eyeLevelOf(rowById[a.astronaut_id]) ?? a.level, overdue: rowById[a.astronaut_id]?.overdue }))
      .filter((a) => a.level === 'RED' || a.level === 'AMBER' || a.overdue),
  ) // RED first
  const crew = sortBySeverity(rows, eyeLevelOf)
  const cabin = overview.cabin
  const insights = overview.insights ?? []
  const missionDay = mission?.mission_day_today

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-title text-4xl md:text-5xl">Crew eye health</h1>
          <p className="text-slate-400">
            {mission?.name && <>{mission.name} · </>}
            Mission day <span className="font-mono text-white">{missionDay ?? '–'}</span>
          </p>
        </div>
        <Link to="/report" className="btn-primary">
          <PrinterIcon className="size-5" /> Weekly Earth Report
        </Link>
      </div>

      <section aria-labelledby="alerts-title">
        <h2 id="alerts-title" className="mb-3 text-xl font-semibold">
          Eye alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="card p-5 text-slate-400">No alerts right now.</p>
        ) : (
          <ul className="card divide-y divide-white/[0.06] overflow-hidden">
            {alerts.map((alert, i) => (
              <li key={`${alert.astronaut_id ?? 'cabin'}-${i}`}>
                {/* Alerts about one astronaut open their trend; cabin alerts (astronaut_id null) are not links. */}
                {alert.astronaut_id != null ? (
                  <Link
                    to={`/trends/${alert.astronaut_id}`}
                    className="group relative isolate flex min-h-16 items-center gap-4 px-5 py-3"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 bg-sky-400/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <AlertBody alert={alert} />
                    <ArrowRightIcon className="size-5 shrink-0 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-sky-300" />
                  </Link>
                ) : (
                  <div className="flex min-h-16 items-center gap-4 px-5 py-3">
                    <AlertBody alert={alert} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {cabin && (
          <section className="card flex flex-col gap-4 p-5" aria-labelledby="cabin-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="cabin-title" className="flex items-center gap-2 text-xl font-semibold">
                <WindIcon className="size-6 text-slate-400" /> Cabin CO₂
              </h2>
              <StatusBadge level={cabin.co2_level} size="sm" />
            </div>
            <p className="-mt-2 text-sm text-slate-400">A factor studied in SANS.</p>
            <dl className="grid grid-cols-2 gap-3">
              <CabinValue label="CO₂ today" value={cabin.co2_mmhg_today} />
              <CabinValue label="5-day average" value={cabin.co2_5day_avg} />
            </dl>
          </section>
        )}

        <section className="card flex flex-col gap-3 p-5" aria-labelledby="crew-insights-title">
          <div>
            <h2 id="crew-insights-title" className="text-xl font-semibold">
              SANS factor insights
            </h2>
            <p className="text-sm text-slate-400">Cabin CO₂, salt and exercise are studied as possible factors in SANS. {INSIGHT_CAPTION}</p>
          </div>
          {insights.length === 0 ? (
            <p className="text-slate-400">No patterns found this week.</p>
          ) : (
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="rounded-xl bg-slate-950/60 px-4 py-2.5 text-slate-300">
                  {typeof insight === 'string' ? insight : insight.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="crew-title">
        <h2 id="crew-title" className="mb-3 text-xl font-semibold">
          Crew members
        </h2>
        {crew.length === 0 ? (
          <EmptyState title="No crew members" message="No astronauts are linked to this mission yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crew.map((astronaut) => (
              <CrewCard key={astronaut.astronaut_id} astronaut={astronaut} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AlertBody({ alert }) {
  return (
    <>
      <StatusBadge level={alert.level} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-mono font-medium">{alert.call_sign ?? 'Cabin'}</p>
        <p className="text-slate-300">{alert.text}</p>
      </div>
    </>
  )
}

function CabinValue({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-950/60 px-4 py-3">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="font-mono text-2xl font-semibold">
        {value ?? '–'} <span className="text-sm font-normal text-slate-400">mmHg</span>
      </dd>
    </div>
  )
}
