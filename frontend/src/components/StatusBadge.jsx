import { getLevel, normalizeLevel } from '../utils/status.js'
import { StatusIcon } from './Icons.jsx'

const SIZES = {
  sm: 'gap-1.5 px-2 py-0.5 text-sm',
  md: 'gap-1.5 px-2.5 py-1 text-[0.95rem]',
  lg: 'gap-2 px-3 py-1.5 text-lg',
}
const ICON_SIZES = { sm: 'size-4', md: 'size-[18px]', lg: 'size-5' }

/**
 * The one status badge used everywhere: colour + icon shape + word, as a quiet tinted label.
 * tone="light" is for the white printable report.
 * (pulse is still accepted so older callers keep working; the badge no longer animates.)
 */
// eslint-disable-next-line no-unused-vars
export default function StatusBadge({ level, size = 'md', tone = 'dark', pulse, className = '' }) {
  const key = normalizeLevel(level)
  const { word, color, textOnLight } = getLevel(key)
  // On dark backgrounds grey text is too faint, so "No data" uses a lighter grey.
  const textColor = tone === 'light' ? textOnLight : key === 'UNKNOWN' ? '#c8c2e8' : color

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md font-medium whitespace-nowrap ${SIZES[size]} ${className}`}
      style={{ color: textColor, backgroundColor: `${color}${tone === 'light' ? '1a' : '24'}`, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <StatusIcon level={key} className={ICON_SIZES[size]} />
      {word}
    </span>
  )
}
