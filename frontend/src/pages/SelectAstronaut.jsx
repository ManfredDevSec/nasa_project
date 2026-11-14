import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAstronauts } from '../api/client'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function SelectAstronaut() {
  const navigate = useNavigate()
  const [astronauts, setAstronauts] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    getAstronauts()
      .then(setAstronauts)
      .catch(setError)
  }

  useEffect(load, [])

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header />
      <main className="max-w-lg mx-auto px-4 pt-8 pb-16">
        <h1 className="text-base font-semibold text-ink mb-1">Select crew member</h1>
        <p className="text-muted text-sm mb-6">Select your name to begin your vision check.</p>

        {!astronauts && !error && <Loading label="Fetching crew…" />}
        {error && <ErrorBox error={error} onRetry={load} />}

        {astronauts && (
          <div className="flex flex-col" style={{ borderTop: '1px solid var(--line)' }}>
            {astronauts.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/astronaut/${a.id}`)}
                className="flex items-center gap-4 w-full min-h-[56px] py-3 text-left hover:bg-surface transition-colors duration-150"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <div
                  className="flex items-center justify-center w-9 h-9 font-mono text-xs font-medium text-muted shrink-0"
                  style={{ border: '1px solid var(--line)' }}
                >
                  {initials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink leading-tight truncate">{a.name}</p>
                  <p className="text-xs text-muted mt-0.5">{a.role}</p>
                </div>
                {a.last_test_date && (
                  <span className="font-mono text-xs text-dim shrink-0">{a.last_test_date}</span>
                )}
                <StatusBadge level={a.latest_status?.level ?? null} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/crew')}
          className="mt-8 text-sm text-dim hover:text-muted transition-colors duration-150"
        >
          Crew medical view
        </button>
      </main>
    </div>
  )
}
