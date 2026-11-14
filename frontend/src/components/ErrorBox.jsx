export default function ErrorBox({ error, onRetry }) {
  return (
    <div
      className="mx-4 my-6 p-5"
      style={{ borderLeft: '3px solid var(--alert)', backgroundColor: 'var(--surface)' }}
    >
      <p className="text-alert font-medium text-sm mb-1">Error</p>
      <p className="text-muted text-sm mb-4 leading-relaxed">{error?.message ?? String(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-ink border border-line hover:bg-line transition-colors duration-150"
        >
          Retry
        </button>
      )}
    </div>
  )
}
