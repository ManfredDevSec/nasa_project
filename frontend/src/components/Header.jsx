import { useNavigate } from 'react-router-dom'

export default function Header({ astronaut, backTo }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-4 px-4 py-4 border-b border-slate-800">
      {backTo != null && (
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center justify-center w-14 h-14 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all shrink-0"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-2xl font-black tracking-tight text-white">SightLine</span>
        {astronaut && (
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-sm text-slate-400 font-medium truncate">{astronaut.name}</span>
            {astronaut.mission_day != null && (
              <span className="text-sm text-slate-500">Day {astronaut.mission_day}</span>
            )}
            {astronaut.streak > 0 && (
              <span className="text-sm text-amber-400 font-semibold">🔥 {astronaut.streak}-wk streak</span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
