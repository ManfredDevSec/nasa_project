import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getEngagement } from '../api/index.js'
import { BroadcastIcon, ChartIcon, FlameIcon, HomeIcon, StatusIcon } from '../components/Icons.jsx'
import { EmptyState } from '../components/StateViews.jsx'
import { INSIGHT_CAPTION } from '../content/learn.js'
import { getUser } from '../utils/auth.js'
import { WORSE_EYE_LABELS, isFirstPriority, sortedActions, topInsights } from '../utils/assessment.js'
import { shortDate } from '../utils/dates.js'
import { testsIncreased } from '../utils/engagement.js'
import { readLastResult } from '../utils/lastResult.js'
import { getLevel, normalizeLevel } from '../utils/status.js'
import { useApi } from '../utils/useApi.js'

// The eye test page passes { result: { check, assessment }, testsBefore } in the route state.
// sessionStorage keeps a copy so a page refresh still shows the result.

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
  const actions = sortedActions(assessment)
  const insights = topInsights(assessment)

  return (
    <div className="flex flex-col gap-6">
      {assessment.escalate_to_earth && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-sky-400/50 bg-sky-400/10 p-4">
          <BroadcastIcon className="size-6 shrink-0 text-sky-400" />
          <p className="font-medium">A report will be sent to your flight surgeon.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <div className="card flex flex-col items-center gap-4 p-6">
          <StatusCircle level={level} />
          <dl className="w-full space-y-2 text-center">
            {assessment.worse_eye && (
              <div>
                <dt className="text-sm text-slate-400">Most change</dt>
                <dd className="font-medium">{WORSE_EYE_LABELS[assessment.worse_eye] ?? assessment.worse_eye}</dd>
              </div>
            )}
            {assessment.next_test_due && (
              <div>
                <dt className="text-sm text-slate-400">Next test</dt>
                <dd className="font-mono font-medium">{shortDate(assessment.next_test_due)}</dd>
              </div>
            )}
          </dl>
          <TestsCounter astronautId={user.astronaut_id} testsBefore={saved.testsBefore} />
        </div>

        <div className="flex flex-col gap-6">
          <section className="card p-6" aria-labelledby="reasons-title">
            <h2 id="reasons-title" className="mb-3 text-xl font-semibold">
              Why you got this result
            </h2>
            {assessment.reasons?.length ? (
              <ul className="list-disc space-y-2 pl-6 text-slate-200 marker:text-slate-500">
                {assessment.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">No details were given for this result.</p>
            )}
          </section>

          <ActionChecklist actions={actions} />

          {insights.length > 0 && (
            <section className="rounded-2xl border border-slate-800 p-5" aria-labelledby="factors-title">
              <h2 id="factors-title" className="font-semibold text-slate-200">
                Possible factors
              </h2>
              <p className="mb-3 text-sm text-slate-400">{INSIGHT_CAPTION}</p>
              {/* Only `text` is shown, so new insight types need no code change. */}
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li key={i} className="rounded-xl bg-slate-900 px-4 py-3 text-slate-300">
                    {insight.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <Link to="/home" className="btn-secondary">
              <HomeIcon className="size-5" /> Back to home
            </Link>
            <Link to={`/trends/${user.astronaut_id}`} className="btn-primary">
              <ChartIcon className="size-5" /> View my trend
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCircle({ level }) {
  const { word, color } = getLevel(level)
  return (
    <div className="relative">
      {level === 'RED' && (
        <span
          aria-hidden="true"
          className="absolute -inset-3 rounded-full border-4 motion-safe:animate-pulse-slow"
          style={{ borderColor: color }}
        />
      )}
      <div
        className="flex size-52 flex-col items-center justify-center gap-2 rounded-full border-[10px]"
        style={{ borderColor: color, backgroundColor: `${color}1a`, color: level === 'UNKNOWN' ? '#b4bdb8' : color }}
      >
        <StatusIcon level={level} className="size-14" />
        <span className="text-3xl font-bold tracking-wide">{word}</span>
      </div>
    </div>
  )
}

function ActionChecklist({ actions }) {
  const [done, setDone] = useState({})
  return (
    <section className="card p-6" aria-labelledby="actions-title">
      <h2 id="actions-title" className="mb-3 text-xl font-semibold">
        What to do next
      </h2>
      {actions.length === 0 ? (
        <p className="text-slate-400">Nothing extra to do. Keep up your weekly test.</p>
      ) : (
        <ul className="space-y-1">
          {actions.map((action, i) => {
            const id = action.code ?? i
            return (
              <li key={id}>
                <label className="flex min-h-12 cursor-pointer items-start gap-4 rounded-xl p-3 transition-colors hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={!!done[id]}
                    onChange={(e) => setDone((d) => ({ ...d, [id]: e.target.checked }))}
                    className="mt-0.5 size-6 shrink-0 cursor-pointer accent-sky-400"
                  />
                  <span className={done[id] ? 'text-slate-500 line-through' : 'text-slate-100'}>{action.text}</span>
                  {isFirstPriority(action, actions) && (
                    <span className="ml-auto shrink-0 rounded-md border border-slate-600 px-2 py-0.5 font-mono text-xs tracking-widest text-slate-300">
                      FIRST
                    </span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// Shows the number of tests and celebrates when it went up compared with just before this test.
function TestsCounter({ astronautId, testsBefore }) {
  const { data, loading, error } = useApi(() => getEngagement(astronautId), [astronautId])

  if (loading) return <p className="text-sm text-slate-500">Checking your progress…</p>
  if (error || !data) return <p className="text-sm text-slate-500">Progress unavailable right now.</p>

  const grew = testsIncreased(testsBefore, data)
  return (
    <div className="relative flex w-full flex-col items-center gap-1 rounded-xl border border-slate-800 p-4" aria-live="polite">
      {grew && <span aria-hidden="true" className="absolute top-3 size-12 animate-burst rounded-full border-2 border-sky-400" />}
      <FlameIcon className={`size-8 text-sky-400 ${grew ? 'animate-celebrate' : ''}`} />
      <p className="text-lg font-semibold">
        {data.tests_completed} test{data.tests_completed === 1 ? '' : 's'} done
      </p>
      <p className="text-center text-sm text-slate-400">
        {grew ? 'Test saved. Thanks for testing on time!' : null}
        {grew && <br />}
        {data.streak_weeks} week{data.streak_weeks === 1 ? '' : 's'} in a row
      </p>
    </div>
  )
}
