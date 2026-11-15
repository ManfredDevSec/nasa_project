import { Link } from 'react-router-dom'
import { getActiveMission, getBodyMap, getEngagement, getTrends } from '../api/index.js'
import { EyeIcon } from '../components/Icons.jsx'
import SourcedText, { NasaLink } from '../components/SourcedText.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { getUser } from '../utils/auth.js'
import { findPart } from '../utils/bodyMap.js'
import { missionToday, relativeDue, shortDate } from '../utils/dates.js'
import { badgeName, earnedBadges } from '../utils/engagement.js'
import { PART_META } from '../utils/parts.js'
import { latestRow } from '../utils/trends.js'
import { useApi } from '../utils/useApi.js'

/**
 * Astronaut home, "one answer first": the eye status and what to do, then a few quiet numbers,
 * then one short explanation. The only action on the page is starting the eye test
 * (the trend and Learn pages are in the navigation).
 */
export default function Home() {
  const user = getUser()
  const id = user.astronaut_id
  // The body map (for the EYES status) is required; the rest only adds detail, so it may fail quietly.
  const { data, loading, error, reload } = useApi(
    () =>
      Promise.all([
        getBodyMap(id),
        getActiveMission().catch(() => null),
        getEngagement(id).catch(() => null),
        getTrends(id).catch(() => null),
      ]),
    [id],
  )

  if (loading && !data) return <LoadingState label="Loading your eye check…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const [bodyMap, mission, engagement, trends] = data
  const eyes = findPart(bodyMap.parts ?? [], 'EYES')
  const today = missionToday(mission)
  const badges = earnedBadges(engagement)
  const latest = latestRow(trends?.vision)
  const baseline = trends?.baseline ?? {}

  if (!eyes) {
    return (
      <EmptyState title="No eye tests yet" message="Take your first eye test so Sightline can learn your baseline.">
        <StartTestButton />
      </EmptyState>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="display-title text-3xl md:text-4xl">{user.display_name ?? user.username}</h1>
        {mission && (
          <p className="text-slate-400">
            Day <span className="text-white">{mission.mission_day_today}</span> · {mission.name}
          </p>
        )}
      </header>

      {/* The answer */}
      <section aria-labelledby="status-title" className="flex flex-col items-start gap-5">
        <h2 id="status-title" className="sr-only">
          Your eye status
        </h2>
        <StatusBadge level={eyes.level} size="lg" />
        <p className="text-2xl leading-snug text-white md:text-3xl">{eyes.summary}</p>
        <StartTestButton />
      </section>

      {/* The numbers, quietly */}
      <dl className="divide-y divide-slate-800 border-y border-slate-800">
        <Row label="Left eye" value={latest?.near_vision_left} note={normalNote(baseline.near_vision_left)} />
        <Row label="Right eye" value={latest?.near_vision_right} note={normalNote(baseline.near_vision_right)} />
        <Row label="Streak" value={engagement ? `${engagement.streak_weeks} weeks` : null} />
        <Row
          label="Next test"
          value={engagement?.next_test_due ? relativeDue(engagement.next_test_due, today) : null}
          note={engagement?.next_test_due ? shortDate(engagement.next_test_due) : null}
        />
      </dl>

      {/* One short explanation */}
      <section aria-labelledby="space-title" className="flex flex-col gap-3">
        <h2 id="space-title" className="text-lg font-semibold">
          What space does to your eyes
        </h2>
        {eyes.info?.space_effect && <SourcedText text={eyes.info.space_effect} className="text-slate-300" />}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/learn" className="text-sky-400 underline-offset-4 hover:underline">
            Learn more about SANS
          </Link>
          <NasaLink url={PART_META.EYES.readMore} />
        </div>
      </section>

      {badges.length > 0 && (
        <p className="text-sm text-slate-400">Badges: {badges.map((b) => b.name ?? badgeName(b.code)).join(' · ')}</p>
      )}
    </div>
  )
}

function StartTestButton() {
  return (
    <Link to="/test" className="btn-primary">
      <EyeIcon className="size-5" /> Start eye test
    </Link>
  )
}

// The baseline is an average of several baseline tests, so it can be a fraction (e.g. 8.33).
const formatLine = (value) => (value == null ? '–' : Number.isInteger(value) ? value : value.toFixed(1))
const normalNote = (baseline) => (baseline == null ? null : `normal ${formatLine(baseline)}`)

function Row({ label, value, note }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right">
        <span className="font-medium text-white">{typeof value === 'number' ? formatLine(value) : (value ?? '–')}</span>
        {note && <span className="ml-2 text-sm text-slate-400">{note}</span>}
      </dd>
    </div>
  )
}
