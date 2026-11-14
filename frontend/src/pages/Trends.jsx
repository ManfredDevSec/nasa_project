import { Link, useParams } from 'react-router-dom'
import { getTrends } from '../api/index.js'
import { ArrowLeftIcon } from '../components/Icons.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import TrendChart from '../components/TrendChart.jsx'
import { canSeeCrew, getUser } from '../utils/auth.js'
import { latestRow } from '../utils/trends.js'
import { useApi } from '../utils/useApi.js'

export default function Trends() {
  const { id } = useParams()
  const user = getUser()
  const { data, loading, error, reload } = useApi(() => getTrends(id), [id])
  // Medical staff came from the crew dashboard; crew came from home.
  const back = canSeeCrew(user) ? { to: '/crew', label: 'Crew' } : { to: '/home', label: 'Home' }

  if (loading) return <LoadingState label="Loading trend…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const vision = data.vision ?? []
  const latest = latestRow(vision)
  const baseline = data.baseline ?? {}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to={back.to} className="btn-secondary px-4">
          <ArrowLeftIcon className="size-5" /> {back.label}
        </Link>
        <div className="flex-1">
          <h1 className="display-title text-3xl md:text-4xl">
            {data.astronaut?.name ?? 'Astronaut'}
            {data.astronaut?.call_sign && <span className="ml-3 font-mono text-base text-slate-400">{data.astronaut.call_sign}</span>}
          </h1>
          <p className="text-slate-400">Eye test trend compared with their own baseline</p>
        </div>
        {latest && <StatusBadge level={latest.level} size="lg" />}
      </div>

      {vision.length === 0 ? (
        <EmptyState title="No eye tests yet" message="The trend will appear here after the first weekly eye test." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Latest test" value={`Day ${latest.mission_day}`} />
            <Summary label="Left eye (latest / baseline)" value={`Line ${latest.near_vision_left ?? '–'} / ${baseline.near_vision_left ?? '–'}`} />
            <Summary label="Right eye (latest / baseline)" value={`Line ${latest.near_vision_right ?? '–'} / ${baseline.near_vision_right ?? '–'}`} />
          </div>
          <TrendChart trends={data} />
        </>
      )}
    </div>
  )
}

function Summary({ label, value }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  )
}
