import { getLevel, normalizeLevel } from '../utils/status.js'
import { StatusIcon } from './Icons.jsx'

const SIZES = {
  sm: 'gap-1.5 px-2.5 py-1 text-sm',
  md: 'gap-2 px-3 py-1.5 text-base',
  lg: 'gap-2.5 px-4 py-2 text-xl',
}
const ICON_SIZES = { sm: 'size-4', md: 'size-5', lg: 'size-6' }

/**
 * The one status badge used everywhere: colour + icon shape + word.
 * tone="light" is for the white printable report.
 * RED badges get a slowly pulsing halo (turned off with pulse={false}, and by reduced-motion settings).
 */
export default function StatusBadge({ level, size = 'md', tone = 'dark', pulse = true, className = '' }) {
  const key = normalizeLevel(level)
  const { word, color, textOnLight } = getLevel(key)
  // On dark backgrounds grey text is too faint, so NO DATA uses a lighter grey.
  const textColor = tone === 'light' ? textOnLight : key === 'UNKNOWN' ? '#c8c2e8' : color

  return (
    <span
      className={`relative inline-flex shrink-0 items-center rounded-full border-2 font-semibold tracking-wide whitespace-nowrap ${SIZES[size]} ${className}`}
      style={{ borderColor: color, color: textColor, backgroundColor: `${color}1f` }}
    >
      {pulse && key === 'RED' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1.5 rounded-full border-2 motion-safe:animate-pulse-slow print:hidden"
          style={{ borderColor: color }}
        />
      )}
      <StatusIcon level={key} className={ICON_SIZES[size]} />
      {word}
    </span>
  )
}
