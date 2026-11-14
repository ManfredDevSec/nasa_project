export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div
        className="w-5 h-5 rounded-full animate-spin"
        style={{ border: '1px solid var(--line)', borderTopColor: 'var(--muted)' }}
      />
      <p className="font-mono text-sm text-muted">{label}</p>
    </div>
  )
}
