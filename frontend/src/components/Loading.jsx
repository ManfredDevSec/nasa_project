export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-white rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  )
}
