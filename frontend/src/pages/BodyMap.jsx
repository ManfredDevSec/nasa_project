import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMission, getBodyMap, getEngagement } from '../api/index.js'
import BodyMapScene from '../components/BodyMapScene.jsx'
import { AwardIcon, CalendarIcon, ClockIcon, EyeIcon, FlameIcon, PlusIcon } from '../components/Icons.jsx'
import PartCard from '../components/PartCard.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import VitalsForm from '../components/VitalsForm.jsx'
import { getUser } from '../utils/auth.js'
import { findPart, partsInOrder } from '../utils/bodyMap.js'
import { missionToday, relativeDue, shortDate } from '../utils/dates.js'
import { badgeName, earnedBadges } from '../utils/engagement.js'
import { PART_META } from '../utils/parts.js'
import { useApi } from '../utils/useApi.js'


export default function BodyMap() {
  const user = getUser()
  const id = user.astronaut_id
  // The body map is required; mission and engagement only fill the top bar, so they may fail quietly.
  const { data, loading, error, reload } = useApi(
    () => Promise.all([getBodyMap(id), getActiveMission().catch(() => null), getEngagement(id).catch(() => null)]),
    [id],
  )
  const [selected, setSelected] = useState(null)
  const [vitalsOpen, setVitalsOpen] = useState(false)

  if (loading && !data) return <LoadingState label="Loading your body map…" />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const [bodyMap, mission, engagement] = data
  const parts = bodyMap.parts ?? []
  const today = missionToday(mission)
  const badges = earnedBadges(engagement)

  if (parts.length === 0) {
    return (
      <EmptyState title="No health data yet" message="Take your first eye test so Sightline can learn your baseline.">
        <Link to="/test" className="btn-primary mt-2">
          Start the eye test
        </Link>
      </EmptyState>
    )
  }

  const selectedPart = findPart(parts, selected)
  const orderedParts = partsInOrder(parts)

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
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setVitalsOpen(true)} className="btn-secondary">
            <PlusIcon className="size-5" /> Log today's vitals
          </button>
          <Link to="/test" className="btn-primary">
            <EyeIcon className="size-5" /> Start eye test
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card relative isolate flex flex-col items-center gap-4 overflow-hidden p-6">
          <span
            aria-hidden="true"
            className="absolute top-[38%] left-1/2 -z-10 aspect-square w-[min(90%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(45_190_225/0.22),transparent_68%)]"
          />
          <span
            aria-hidden="true"
            className="absolute top-[38%] left-1/2 -z-10 aspect-square w-[min(80%,360px)] -translate-x-1/2 -translate-y-1/2"
          >
            <span className="block size-full rounded-full border border-dashed border-sky-400/15 motion-safe:animate-[spin_120s_linear_infinite]" />
          </span>
          <p className="eyebrow self-start">Body map</p>
          <BodyMapScene parts={parts} selected={selected} onSelect={setSelected} />
          <p className="text-center text-sm text-slate-400">Tap a part of the body to see what it means.</p>
        </div>

        {selectedPart ? (
          <PartCard key={selectedPart.part} part={selectedPart} onClose={() => setSelected(null)} />
        ) : (
          <section className="card flex flex-col gap-5 p-6" aria-labelledby="overview-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-slate-400">Hello,</p>
                <h1 id="overview-title" className="display-title text-4xl">
                  {user.display_name ?? user.username}
                </h1>
              </div>
              {bodyMap.overall && <StatusBadge level={bodyMap.overall} size="lg" />}
            </div>
            <ul className="flex flex-col gap-2">
              {orderedParts.map((part) => {
                const { label, Icon } = PART_META[part.part]
                return (
                  <li key={part.part}>
                    <button
                      type="button"
                      onClick={() => setSelected(part.part)}
                      className="group relative isolate flex min-h-16 w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-slate-950/40 px-4 py-3 text-left transition-transform duration-300 ease-[var(--ease-spring)] hover:translate-x-1 active:scale-[0.99]"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-2xl bg-sky-400/[0.07] opacity-0 ring-1 ring-sky-400/25 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-400/10 ring-1 ring-sky-400/20">
                        <Icon className="size-6 text-sky-300" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{label}</span>
                        <span className="block truncate text-sm text-slate-400">{part.summary}</span>
                      </span>
                      <StatusBadge level={part.level} size="sm" />
                    </button>
                  </li>
                )
              })}
            </ul>

            {badges.length > 0 && (
              <div>
                <h2 className="eyebrow mb-3">Badges earned</h2>
                <ul className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <li
                      key={badge.code}
                      className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm"
                    >
                      <AwardIcon className="size-4 text-sky-400" />
                      {badgeName(badge.code)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      <VitalsForm
        open={vitalsOpen}
        onClose={() => setVitalsOpen(false)}
        onSaved={reload}
        astronautId={id}
        date={today}
      />
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
