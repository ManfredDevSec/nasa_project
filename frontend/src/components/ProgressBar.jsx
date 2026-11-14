// Segmented bar at the top of the eye test: one segment per test step.
export default function ProgressBar({ current, total, eyeLabel, stepLabel }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-base">
          {eyeLabel && <span className="font-semibold text-white">{eyeLabel}</span>}
          {eyeLabel && <span className="text-slate-500"> · </span>}
          <span className="text-slate-300">{stepLabel}</span>
        </p>
        <p className="font-mono text-sm text-slate-400">
          Step {Math.min(current, total)} of {total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Eye test progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(current, total)}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
              i < current - 1 ? 'bg-sky-400' : i === current - 1 ? 'bg-sky-400/60' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
