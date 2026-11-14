export default function ErrorBox({ error, onRetry }) {
  return (
    <div className="mx-4 my-6 rounded-2xl bg-red-950 border border-red-800 p-6">
      <p className="text-red-400 font-semibold mb-1">Something went wrong</p>
      <p className="text-red-300 text-sm mb-4">{error?.message ?? String(error)}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-600 active:scale-95 transition-all"
        >
          Retry
        </button>
      )}
    </div>
  )
}
