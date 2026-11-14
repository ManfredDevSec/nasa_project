import { Link } from 'react-router-dom'
import { PART_META, PART_ORDER } from '../utils/parts.js'
import { getLevel, normalizeLevel } from '../utils/status.js'
import { ClockIcon, StatusIcon } from './Icons.jsx'
import StatusBadge from './StatusBadge.jsx'

// One astronaut on the crew dashboard. The whole card links to their trend page.
export default function CrewCard({ astronaut }) {
  const { astronaut_id, name, call_sign, overall, parts = {}, headline, overdue } = astronaut
  return (
    <Link
      to={`/trends/${astronaut_id}`}
      aria-label={`${call_sign ?? name}, ${getLevel(overall).word}${overdue ? ', test overdue' : ''}. Open trend`}
      className="card group flex flex-col gap-4 p-5 transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-1 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-xl font-semibold tracking-wide">{call_sign ?? name}</h3>
          {call_sign && <p className="text-sm text-slate-400">{name}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge level={overall} size="sm" />
          {overdue && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500 px-2.5 py-0.5 text-sm text-slate-200">
              <ClockIcon className="size-4" /> Overdue
            </span>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-4 gap-2">
        {PART_ORDER.map((part) => (
          <MiniDot key={part} part={part} level={parts[part]} />
        ))}
      </ul>

      {headline && <p className="text-slate-300">{headline}</p>}
    </Link>
  )
}

// Small status marker: icon shape + colour + part name (+ hidden status word).
function MiniDot({ part, level }) {
  const key = normalizeLevel(level)
  const { color, word } = getLevel(key)
  return (
    <li className="flex flex-col items-center gap-1 rounded-lg bg-slate-950/60 py-2">
      <span style={{ color }} className={key === 'RED' ? 'motion-safe:animate-pulse-slow' : ''}>
        <StatusIcon level={key} className="size-5" />
      </span>
      <span className="text-xs text-slate-400">{PART_META[part].label}</span>
      <span className="sr-only">{word}</span>
    </li>
  )
}
