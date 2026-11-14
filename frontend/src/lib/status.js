export const STATUS = {
  GREEN: {
    label: 'ALL CLEAR',
    bg: 'bg-emerald-500',
    text: 'text-emerald-500',
    ring: 'ring-emerald-500',
  },
  AMBER: {
    label: 'WATCH',
    bg: 'bg-amber-400',
    text: 'text-amber-400',
    ring: 'ring-amber-400',
  },
  RED: {
    label: 'ACT NOW',
    bg: 'bg-red-500',
    text: 'text-red-500',
    ring: 'ring-red-500',
  },
}

export function getStatus(level) {
  return STATUS[level] ?? { label: level ?? 'UNKNOWN', bg: 'bg-slate-600', text: 'text-slate-400', ring: 'ring-slate-600' }
}
