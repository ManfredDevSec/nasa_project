import { getStatus } from '../lib/status'

export default function StatusBadge({ level }) {
  const s = getStatus(level)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          flexShrink: 0,
          backgroundColor: s.hex,
        }}
      />
      <span style={{ color: s.hex }}>{s.label}</span>
    </span>
  )
}
