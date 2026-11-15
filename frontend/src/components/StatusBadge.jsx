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
 * tone="light" is for the white printable report. (`pulse` is accepted for older callers;
 * badges no longer pulse.)
 */
// eslint-disable-next-line no-unused-vars
export default function StatusBadge({ level, size = 'md', tone = 'dark', pulse, className = '' }) {
  const key = normalizeLevel(level)
  const { word, color, textOnLight } = getLevel(key)
  // On dark backgrounds grey text is too faint, so NO DATA uses a lighter grey.
  const textColor = tone === 'light' ? textOnLight : key === 'UNKNOWN' ? '#b4bdb8' : color

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border font-semibold whitespace-nowrap ${SIZES[size]} ${className}`}
      style={{ borderColor: color, color: textColor, backgroundColor: `${color}1f` }}
    >
      <StatusIcon level={key} className={ICON_SIZES[size]} />
      {word}
    </span>
  )
}
