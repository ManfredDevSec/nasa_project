import { Link } from 'react-router-dom'
import { getLevel } from '../utils/status.js'
import { ClockIcon, EyeIcon } from './Icons.jsx'
import StatusBadge from './StatusBadge.jsx'

// The eye (SANS) status for a crew-overview row. Only the eyes count in Sightline.
export const eyeLevelOf = (row) => row?.parts?.EYES ?? row?.overall

// One astronaut on the crew dashboard: their eye status and latest eye-test headline.
// The whole card links to their trend page.
export default function CrewCard({ astronaut }) {
  const { astronaut_id, name, call_sign, headline, overdue } = astronaut
  const level = eyeLevelOf(astronaut)
  return (
    <Link
      to={`/trends/${astronaut_id}`}
      aria-label={`${call_sign ?? name}, eyes ${getLevel(level).word}${overdue ? ', test overdue' : ''}. Open eye trend`}
      className="card group flex flex-col gap-4 p-5 transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-1 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-xl font-semibold tracking-wide">{call_sign ?? name}</h3>
          {call_sign && <p className="text-sm text-slate-400">{name}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge level={level} size="sm" />
          {overdue && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500 px-2.5 py-0.5 text-sm text-slate-200">
              <ClockIcon className="size-4" /> Overdue
            </span>
          )}
        </div>
      </div>

      {headline && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-950/60 px-3 py-2.5 text-slate-300">
          <EyeIcon className="mt-0.5 size-5 shrink-0 text-sky-300" />
          {headline}
        </p>
      )}
    </Link>
  )
}
