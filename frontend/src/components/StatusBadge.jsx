import { getStatus } from '../lib/status'

export default function StatusBadge({ level }) {
  const s = getStatus(level)
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${s.bg} text-slate-950`}>
      {s.label}
    </span>
  )
}
