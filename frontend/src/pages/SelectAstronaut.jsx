import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAstronauts } from '../api/client'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'

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
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <main className="max-w-lg mx-auto px-4 pt-8 pb-16">
        <h1 className="text-3xl font-black mb-2 leading-tight">Who's testing today?</h1>
        <p className="text-slate-400 mb-8 text-sm">Select your name to begin your vision check.</p>

        {!astronauts && !error && <Loading label="Fetching crew…" />}
        {error && <ErrorBox error={error} onRetry={load} />}

        {astronauts && (
          <div className="flex flex-col gap-4">
            {astronauts.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/astronaut/${a.id}`)}
                className="flex items-center justify-between gap-4 w-full min-h-[72px] px-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 active:scale-[0.98] transition-all text-left"
              >
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight truncate">{a.name}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{a.role}</p>
                </div>
                <StatusBadge level={a.latest_status?.level ?? null} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/crew')}
          className="mt-8 w-full min-h-[56px] rounded-2xl border border-slate-700 text-slate-400 font-medium hover:border-slate-500 hover:text-slate-200 active:scale-[0.98] transition-all"
        >
          Crew Medical View
        </button>
      </main>
    </div>
  )
}
