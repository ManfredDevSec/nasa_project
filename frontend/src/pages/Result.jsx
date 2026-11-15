import { Link, useLocation } from 'react-router-dom'
import { getEngagement } from '../api/index.js'
import { BroadcastIcon } from '../components/Icons.jsx'
import { EmptyState } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { INSIGHT_CAPTION } from '../content/learn.js'
import { getUser } from '../utils/auth.js'
import { WORSE_EYE_LABELS, sortedActions, topInsights } from '../utils/assessment.js'
import { shortDate } from '../utils/dates.js'
import { testsIncreased } from '../utils/engagement.js'
import { readLastResult } from '../utils/lastResult.js'
import { normalizeLevel } from '../utils/status.js'
import { useApi } from '../utils/useApi.js'

// The eye test page passes { result: { check, assessment }, testsBefore } in the route state.
// sessionStorage keeps a copy so a page refresh still shows the result.

// This action is something Sightline does, not something the astronaut does; when the result is
// escalated it is shown once as a notice instead of as a step in the list.
const SYSTEM_ACTIONS = ['ESCALATE_EARTH']

/**
 * The result of one eye test, "one answer first" like Home: the status and why, then what to do
 * as a plain numbered list (most urgent first), then a few quiet facts and possible factors.
 */
export default function Result() {
  const location = useLocation()
  const saved = location.state ?? readLastResult()
  const assessment = saved?.result?.assessment
  const user = getUser()

  if (!assessment) {
    return (
      <EmptyState title="No result to show yet" message="Take this week's eye test to see your result here.">
        <Link to="/test" className="btn-primary mt-2">
          Start the eye test
        </Link>
      </EmptyState>
    )
  }

  const level = normalizeLevel(assessment.level)
  const [headline, ...otherReasons] = assessment.reasons ?? []
  const steps = sortedActions(assessment).filter(
    (action) => !(assessment.escalate_to_earth && SYSTEM_ACTIONS.includes(action.code)),
  )
  const insights = topInsights(assessment)
  const missionDay = saved.result.check?.mission_day

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      {/* The answer */}
      <section aria-labelledby="result-title" className="flex flex-col items-start gap-5">
        <p className="text-slate-400">Your eye test result{missionDay != null && ` · Day ${missionDay}`}</p>
        <StatusBadge level={level} size="lg" />
        <h1 id="result-title" className="text-2xl leading-snug text-white md:text-3xl">
          {headline ?? 'No change from your normal.'}
        </h1>
        {otherReasons.length > 0 && (
          <ul className="list-disc space-y-1 pl-6 text-slate-300 marker:text-slate-500">
            {otherReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        )}
        {assessment.escalate_to_earth && (
          <p role="status" className="flex items-center gap-3 text-slate-200">
            <BroadcastIcon className="size-5 shrink-0 text-sky-400" />
            Your flight surgeon has been sent a priority note. You don&apos;t need to do anything for this.
          </p>
        )}
      </section>

      {/* What to do, in order */}
      <section aria-labelledby="steps-title">
        <h2 id="steps-title" className="mb-3 text-lg font-semibold">
          What to do now
        </h2>
        {steps.length === 0 ? (
          <p className="text-slate-300">Nothing extra. Keep up your weekly test.</p>
        ) : (
          <ol className="list-decimal space-y-2 pl-6 text-lg text-slate-100 marker:text-slate-500">
            {steps.map((action, i) => (
              <li key={action.code ?? i} className="pl-1">
                {action.text}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* A few quiet facts */}
      <dl className="divide-y divide-slate-800 border-y border-slate-800">
        {assessment.worse_eye && (
          <Row label="Most change" value={WORSE_EYE_LABELS[assessment.worse_eye] ?? assessment.worse_eye} />
        )}
        {assessment.next_test_due && <Row label="Next test" value={shortDate(assessment.next_test_due)} />}
        <TestsRow astronautId={user.astronaut_id} testsBefore={saved.testsBefore} />
      </dl>

      {insights.length > 0 && (
        <section aria-labelledby="factors-title" className="flex flex-col gap-2">
          <h2 id="factors-title" className="text-lg font-semibold">
            Possible factors
          </h2>
          <p className="text-sm text-slate-400">{INSIGHT_CAPTION}</p>
          {/* Only `text` is shown, so new insight types need no code change. */}
          <ul className="list-disc space-y-1 pl-6 text-slate-300 marker:text-slate-500">
            {insights.map((insight, i) => (
              <li key={i}>{insight.text}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link to="/home" className="btn-primary">
          Done
        </Link>
        <Link to={`/trends/${user.astronaut_id}`} className="text-sky-400 underline-offset-4 hover:underline">
          See your trend
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value, note }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right">
        <span className="font-medium text-white">{value}</span>
        {note && <span className="ml-2 text-sm text-slate-400">{note}</span>}
      </dd>
    </div>
  )
}

// Tests done and the weekly streak; says "Test saved" when the count went up with this test.
function TestsRow({ astronautId, testsBefore }) {
  const { data } = useApi(() => getEngagement(astronautId), [astronautId])
  if (!data) return null
  const saved = testsIncreased(testsBefore, data)
  const weeks = `${data.streak_weeks} week${data.streak_weeks === 1 ? '' : 's'} in a row`
  return (
    <div aria-live="polite">
      <Row
        label={saved ? 'Test saved' : 'Tests done'}
        value={`${data.tests_completed} test${data.tests_completed === 1 ? '' : 's'}`}
        note={weeks}
      />
    </div>
  )
}
