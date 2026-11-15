import { Link } from 'react-router-dom'
import { getActiveMission, getBodyMap, getEngagement, getTrends } from '../api/index.js'
import { AwardIcon, CalendarIcon, ChartIcon, ClockIcon, EyeIcon, FlameIcon } from '../components/Icons.jsx'
import SourcedText, { NasaLink } from '../components/SourcedText.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { getUser } from '../utils/auth.js'
import { findPart } from '../utils/bodyMap.js'
import { missionToday, relativeDue, shortDate } from '../utils/dates.js'
import { badgeName, earnedBadges } from '../utils/engagement.js'
import { PART_META } from '../utils/parts.js'
import { getLevel } from '../utils/status.js'
import { latestRow } from '../utils/trends.js'
import { useApi } from '../utils/useApi.js'

/**
 * Astronaut home: everything about your eyes and SANS, and nothing else.
 * Uses the EYES part of the body-map response, plus trends (each eye against its baseline),
 * engagement (streak, next test, badges) and the active mission (mission day).
 */

const EYE_PHOTO = `${import.meta.env.BASE_URL}landing/eye-real.jpg`

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

  if (!eyes) {
    return (
      <EmptyState title="No eye tests yet" message="Take your first eye test so Sightline can learn your baseline.">
        <Link to="/test" className="btn-primary mt-2">
          Start the eye test
        </Link>
      </EmptyState>
    )
  }

  const latest = latestRow(trends?.vision)
  const baseline = trends?.baseline ?? {}

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-stretch">
        <Stat Icon={CalendarIcon} label="Mission day" value={mission?.mission_day_today ?? '–'} detail={mission?.name} />
        <Stat Icon={FlameIcon} label="Test streak" value={engagement ? `${engagement.streak_weeks} weeks` : '–'} />
        <Stat
          Icon={ClockIcon}
          label="Next eye test"
          value={engagement ? relativeDue(engagement.next_test_due, today) : '–'}
          detail={engagement?.next_test_due ? shortDate(engagement.next_test_due) : null}
        />
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <Link to={`/trends/${id}`} className="btn-secondary">
            <ChartIcon className="size-5" /> See my trend
          </Link>
          <Link to="/test" className="btn-primary">
            <EyeIcon className="size-5" /> Start eye test
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Your eyes: the eye in a status ring, then each eye against its baseline */}
        <section className="card relative isolate flex flex-col items-center gap-6 overflow-hidden p-6" aria-labelledby="eyes-title">
          <span
            aria-hidden="true"
            className="absolute top-[34%] left-1/2 -z-10 aspect-square w-[min(90%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(127_184_164/0.16),transparent_68%)]"
          />
          <h2 id="eyes-title" className="eyebrow self-start">
            Your eyes
          </h2>
          <EyeRing level={eyes.level} />
          <StatusBadge level={eyes.level} size="lg" />
          <dl className="grid w-full grid-cols-2 gap-3">
            <EyeReading side="Left eye" latest={latest?.near_vision_left} baseline={baseline.near_vision_left} />
            <EyeReading side="Right eye" latest={latest?.near_vision_right} baseline={baseline.near_vision_right} />
          </dl>
          <p className="text-center text-sm text-slate-400">Near vision: the smallest line you can read (1-10). Higher is better.</p>
        </section>

        {/* Your SANS check: status, what it means, what to do */}
        <section className="card flex flex-col gap-5 p-6" aria-labelledby="overview-title">
          <div>
            <p className="text-slate-400">Hello,</p>
            <h1 id="overview-title" className="display-title text-4xl">
              {user.display_name ?? user.username}
            </h1>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-slate-950/40 p-4">
            <p className="eyebrow mb-2 !text-[0.68rem]">Your SANS check</p>
            <p className="text-lg text-white">{eyes.summary}</p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { title: 'What space does to your eyes', text: eyes.info?.space_effect },
              { title: 'What you can do', text: eyes.info?.what_to_do },
            ]
              .filter((s) => s.text)
              .map((s) => (
                <div key={s.title} className="border-l-2 border-sky-400/40 pl-4">
                  <h2 className="mb-1 text-sm font-semibold tracking-wide text-slate-400 uppercase">{s.title}</h2>
                  <SourcedText text={s.text} className="text-slate-200" />
                </div>
              ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/learn" className="rounded text-sky-400 underline-offset-4 hover:text-sky-300 hover:underline">
              What is SANS?
            </Link>
            <NasaLink url={PART_META.EYES.readMore} />
          </div>

          {badges.length > 0 && (
            <div>
              <h2 className="eyebrow mb-3">Badges earned</h2>
              <ul className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <li key={badge.code} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm">
                    <AwardIcon className="size-4 text-sky-400" />
                    {badgeName(badge.code)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// The real eye photo in a circle, ringed in the current status colour, with a slow scan line.
function EyeRing({ level }) {
  const { color, word } = getLevel(level)
  return (
    <div className="relative size-56 md:size-64" role="img" aria-label={`Eye status: ${word}`}>
      <span aria-hidden="true" className="absolute -inset-3 rounded-full opacity-40 blur-xl" style={{ background: color }} />
      <span aria-hidden="true" className="absolute inset-0 rounded-full border-[3px]" style={{ borderColor: color, boxShadow: `0 0 24px ${color}` }} />
      <span aria-hidden="true" className="absolute inset-3 overflow-hidden rounded-full">
        <img
          src={EYE_PHOTO}
          alt=""
          className="size-full object-cover"
          style={{
            // centre the pupil (58.9% / 49.1% of the photo) and fill the circle with the iris
            objectPosition: '58.9% 49.1%',
            transformOrigin: '58.9% 49.1%',
            transform: 'translate(calc(50% - 58.9%), calc(50% - 49.1%)) scale(1.3)',
          }}
        />
        <span className="scene-scan absolute inset-x-0 h-[22%]" />
      </span>
    </div>
  )
}

// The baseline is an average of several baseline tests, so it can be a fraction (e.g. 8.33).
const formatLine = (value) => (value == null ? '–' : Number.isInteger(value) ? value : value.toFixed(1))

// Latest near-vision line for one eye, compared with that eye's baseline (in whole lines).
function EyeReading({ side, latest, baseline }) {
  let note = 'No test yet'
  if (latest != null && baseline != null) {
    const diff = Math.round(latest - baseline)
    note = diff === 0 ? 'Matches your baseline' : `${Math.abs(diff)} line${Math.abs(diff) === 1 ? '' : 's'} ${diff < 0 ? 'below' : 'above'} baseline`
  }
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 px-4 py-3">
      <dt className="eyebrow !text-[0.66rem] !text-slate-400">{side}</dt>
      <dd>
        <span className="font-mono text-2xl font-semibold">{formatLine(latest)}</span>
        <span className="ml-1 text-sm text-slate-400">/ {formatLine(baseline)} baseline</span>
        <span className="block text-sm text-slate-300">{note}</span>
      </dd>
    </div>
  )
}

function Stat({ Icon, label, value, detail }) {
  return (
    <div className="card flex min-w-44 items-center gap-3.5 rounded-2xl px-4 py-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-400/10 ring-1 ring-sky-400/20">
        <Icon className="size-[22px] text-sky-300" />
      </span>
      <div className="leading-tight">
        <p className="eyebrow mb-1 !text-[0.68rem] !text-slate-400">{label}</p>
        <p className="font-mono text-lg font-semibold">
          {value}
          {detail && <span className="ml-2 font-sans text-sm font-normal text-slate-400">{detail}</span>}
        </p>
      </div>
    </div>
  )
}
