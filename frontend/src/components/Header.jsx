import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Header({ astronaut, backTo }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center px-4 py-3 border-b border-line gap-3">
      {backTo != null && (
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center justify-center w-14 h-14 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Back"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
      )}
      <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
        <span className="font-mono text-xs tracking-[0.2em] text-ink shrink-0">SIGHTLINE</span>
        {astronaut && (
          <div className="flex items-center gap-4 font-mono text-sm text-muted min-w-0 justify-end">
            <span className="text-ink font-medium">{astronaut.name}</span>
            {astronaut.mission_day != null && (
              <span className="shrink-0">MD {String(astronaut.mission_day).padStart(3, '0')}</span>
            )}
            {astronaut.streak > 0 && (
              <span className="text-dim shrink-0 hidden sm:inline">{astronaut.streak} weekly tests in a row</span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
