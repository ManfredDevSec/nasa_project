import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAstronaut } from '../api/client'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'
import { getStatus } from '../lib/status'

const ZONES = {
  eyes: {
    label: 'Eyes',
    icon: '👁',
    what: 'Your eyes focus light and send signals to the brain. The optic nerve exits the back of each eye.',
    spaceflight:
      'Fluid shifts toward the head in microgravity and can press on the back of the eye (SANS), which can blur near vision. Some changes may not fully reverse after landing.',
    getActions: (status) => status?.actions ?? 'Take your weekly test to track your vision.',
  },
  brain: {
    label: 'Brain',
    icon: '🧠',
    what: 'The brain controls everything: thinking, mood, coordination, and sleep cycles.',
    spaceflight: 'Radiation and isolation can affect sleep, mood, and thinking. Cognitive load in EVA suits is high.',
    getActions: () => 'Module coming soon.',
  },
  heart: {
    label: 'Heart',
    icon: '❤️',
    what: 'The heart pumps blood throughout the body, adapting to gravity and workload.',
    spaceflight: 'Without gravity the heart works less and can weaken. Fluids shift headward, stressing cardiovascular regulation.',
    getActions: () => 'Module coming soon.',
  },
  bones: {
    label: 'Bones & Muscles',
    icon: '🦴',
    what: 'Bones and muscles provide structure and movement, maintained by mechanical loading.',
    spaceflight: 'Without gravity loading, bones and muscles lose mass rapidly. Daily structured exercise is the main countermeasure.',
    getActions: () => 'Module coming soon.',
  },
}

function HumanFigure({ eyesLevel, activeZone, onZone }) {
  const eyeColor = eyesLevel ? getStatus(eyesLevel).bg : 'bg-slate-600'
  const eyeFill = eyesLevel
    ? eyesLevel === 'GREEN' ? '#10b981' : eyesLevel === 'AMBER' ? '#fbbf24' : '#ef4444'
    : '#475569'

  const zoneClass = (id) =>
    `cursor-pointer transition-all ${activeZone === id ? 'opacity-100' : 'opacity-70 hover:opacity-90'}`

  return (
    <svg
      viewBox="0 0 120 260"
      className="w-full max-w-[180px] mx-auto"
      aria-label="Human body diagram"
    >
      {/* Head */}
      <ellipse cx="60" cy="28" rx="20" ry="23" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* Eyes zone — tappable */}
      <g className={zoneClass('eyes')} onClick={() => onZone('eyes')}>
        <ellipse cx="60" cy="28" rx="20" ry="23" fill="transparent" stroke={eyesLevel ? eyeFill : 'transparent'} strokeWidth="2.5" />
        <circle cx="52" cy="27" r="4" fill={eyeFill} />
        <circle cx="68" cy="27" r="4" fill={eyeFill} />
        <circle cx="52" cy="27" r="2" fill="#0f172a" />
        <circle cx="68" cy="27" r="2" fill="#0f172a" />
      </g>

      {/* Neck */}
      <rect x="54" y="49" width="12" height="10" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />

      {/* Torso */}
      <rect x="38" y="58" width="44" height="70" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* Brain zone — tappable overlay on head */}
      <g className={zoneClass('brain')} onClick={() => onZone('brain')}>
        <ellipse cx="60" cy="22" rx="16" ry="13" fill="#334155" fillOpacity="0.6" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
        <text x="60" y="26" textAnchor="middle" fontSize="9" fill="#94a3b8">brain</text>
      </g>

      {/* Heart zone */}
      <g className={zoneClass('heart')} onClick={() => onZone('heart')}>
        <rect x="40" y="68" width="20" height="20" rx="4" fill="#334155" fillOpacity="0.6" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
        <text x="50" y="82" textAnchor="middle" fontSize="7" fill="#94a3b8">heart</text>
      </g>

      {/* Arms */}
      <rect x="20" y="60" width="16" height="52" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <rect x="84" y="60" width="16" height="52" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* Legs */}
      <rect x="40" y="130" width="17" height="80" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <rect x="63" y="130" width="17" height="80" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* Bones & muscles zone — legs + arms overlay */}
      <g className={zoneClass('bones')} onClick={() => onZone('bones')}>
        <rect x="20" y="60" width="16" height="52" rx="7" fill="#334155" fillOpacity="0.5" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="84" y="60" width="16" height="52" rx="7" fill="#334155" fillOpacity="0.5" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="40" y="130" width="17" height="80" rx="7" fill="#334155" fillOpacity="0.5" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="63" y="130" width="17" height="80" rx="7" fill="#334155" fillOpacity="0.5" stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" />
      </g>

      {/* Zone labels */}
      <text x="60" y="255" textAnchor="middle" fontSize="7" fill="#64748b">tap a zone</text>
    </svg>
  )
}

function ZoneCard({ zone, zoneKey, status, onClose }) {
  const isEyes = zoneKey === 'eyes'
  return (
    <div className="fixed inset-0 bg-slate-950/90 z-40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{zone.icon}</span>
            <h2 className="text-xl font-black">{zone.label}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white">✕</button>
        </div>

        {isEyes && status && (
          <div className="mb-4">
            <StatusBadge level={status.level} />
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-1">What it does</p>
            <p className="text-slate-200 leading-relaxed">{zone.what}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-1">In spaceflight</p>
            <p className="text-slate-200 leading-relaxed">{zone.spaceflight}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-1">
              {isEyes ? 'What to do' : 'Status'}
            </p>
            <p className="text-slate-200 leading-relaxed">{zone.getActions(status)}</p>
          </div>
          {isEyes && status?.reason && (
            <div>
              <p className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-1">Current note</p>
              <p className="text-slate-300 leading-relaxed italic">{status.reason}</p>
            </div>
          )}
        </div>

        {!isEyes && (
          <p className="mt-5 text-center text-xs text-slate-500 italic">Module coming soon</p>
        )}
      </div>
    </div>
  )
}

export default function BodyMap() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [astronaut, setAstronaut] = useState(null)
  const [error, setError] = useState(null)
  const [activeZone, setActiveZone] = useState(null)

  const load = () => {
    setError(null)
    getAstronaut(id).then(setAstronaut).catch(setError)
  }

  useEffect(load, [id])

  const status = astronaut?.latest_status ?? null
  const zone = activeZone ? ZONES[activeZone] : null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header astronaut={astronaut} backTo="/" />

      {!astronaut && !error && <Loading label="Loading astronaut…" />}
      {error && <ErrorBox error={error} onRetry={load} />}

      {astronaut && (
        <main className="max-w-lg mx-auto px-4 pt-6 pb-16">
          <div className="flex justify-center mb-6">
            <HumanFigure
              eyesLevel={status?.level}
              activeZone={activeZone}
              onZone={(z) => setActiveZone(z === activeZone ? null : z)}
            />
          </div>

          {/* Eye status strip */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm uppercase tracking-wider text-slate-400">Eyes</span>
              {status ? <StatusBadge level={status.level} /> : (
                <span className="text-slate-500 text-sm">No data yet</span>
              )}
            </div>
            {status?.reason && (
              <p className="text-slate-300 text-sm mb-3 leading-relaxed">{status.reason}</p>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Next test due</span>
              <span className="font-mono text-slate-300">{astronaut.next_test_due ?? '—'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/astronaut/${id}/test`)}
              className="w-full min-h-[56px] rounded-2xl bg-white text-slate-950 font-bold text-base hover:bg-slate-100 active:scale-[0.98] transition-all"
            >
              Start Eye Test
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full min-h-[56px] rounded-2xl border border-slate-700 text-slate-400 font-medium hover:border-slate-500 hover:text-slate-200 active:scale-[0.98] transition-all"
            >
              Switch Astronaut
            </button>
          </div>
        </main>
      )}

      {zone && (
        <ZoneCard
          zone={zone}
          zoneKey={activeZone}
          status={status}
          onClose={() => setActiveZone(null)}
        />
      )}
    </div>
  )
}
