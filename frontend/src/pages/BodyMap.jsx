import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, Brain, Heart, Bone, X } from 'lucide-react'
import { getAstronaut } from '../api/client'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import Loading from '../components/Loading'
import ErrorBox from '../components/ErrorBox'
import { getStatus } from '../lib/status'

const ZONE_ICONS = { eyes: Eye, brain: Brain, heart: Heart, bones: Bone }
const STATUS_HEX = { GREEN: '#6fae7c', AMBER: '#d9a441', RED: '#d0604f' }

const ZONES = {
  eyes: {
    label: 'Eyes',
    what: 'Your eyes focus light and send signals to the brain. The optic nerve exits the back of each eye.',
    spaceflight:
      'Fluid shifts toward the head in microgravity and can press on the back of the eye (SANS), which can blur near vision. Some changes may not fully reverse after landing.',
    getActions: (status) => status?.actions ?? 'Take your weekly test to track your vision.',
  },
  brain: {
    label: 'Brain',
    what: 'The brain controls everything: thinking, mood, coordination, and sleep cycles.',
    spaceflight: 'Radiation and isolation can affect sleep, mood, and thinking. Cognitive load in EVA suits is high.',
    getActions: () => 'Module coming soon.',
  },
  heart: {
    label: 'Heart',
    what: 'The heart pumps blood throughout the body, adapting to gravity and workload.',
    spaceflight: 'Without gravity the heart works less and can weaken. Fluids shift headward, stressing cardiovascular regulation.',
    getActions: () => 'Module coming soon.',
  },
  bones: {
    label: 'Bones and muscles',
    what: 'Bones and muscles provide structure and movement, maintained by mechanical loading.',
    spaceflight: 'Without gravity loading, bones and muscles lose mass rapidly. Daily structured exercise is the main countermeasure.',
    getActions: () => 'Module coming soon.',
  },
}

function HumanFigure({ eyesLevel, activeZone, onZone }) {
  const [hoverZone, setHoverZone] = useState(null)
  const eyeFill = eyesLevel ? (STATUS_HEX[eyesLevel] ?? '#8a877b') : '#8a877b'
  const BG = '#171814'
  const S = '#b3afa1'
  const LINE = '#2a2b25'

  function zoneStyle(id) {
    const isActive = activeZone === id
    const isHover = hoverZone === id
    return {
      fill: isActive ? 'rgba(42,43,37,0.55)' : isHover ? 'rgba(42,43,37,0.3)' : 'transparent',
      cursor: 'pointer',
    }
  }

  function zoneHandlers(id) {
    return {
      onClick: () => onZone(id),
      onMouseEnter: () => setHoverZone(id),
      onMouseLeave: () => setHoverZone(null),
    }
  }

  /* Draw order: legs → arms → torso → neck → head (back-to-front so fills cover joints) */
  return (
    <svg
      viewBox="0 0 300 390"
      style={{ width: '100%', maxHeight: 420 }}
      aria-label="Human body diagram"
    >
      {/* ── Body parts ── */}
      {/* Legs */}
      <rect x="112" y="185" width="24" height="112" rx="6" fill={BG} stroke={S} strokeWidth="1.5" />
      <rect x="164" y="185" width="24" height="112" rx="6" fill={BG} stroke={S} strokeWidth="1.5" />
      {/* Arms */}
      <rect x="83" y="92" width="27" height="78" rx="6" fill={BG} stroke={S} strokeWidth="1.5" />
      <rect x="190" y="92" width="27" height="78" rx="6" fill={BG} stroke={S} strokeWidth="1.5" />
      {/* Torso */}
      <rect x="108" y="91" width="84" height="97" rx="2" fill={BG} stroke={S} strokeWidth="1.5" />
      {/* Neck */}
      <rect x="144" y="78" width="12" height="16" fill={BG} stroke={S} strokeWidth="1.5" />
      {/* Head */}
      <ellipse cx="150" cy="51" rx="25" ry="30" fill={BG} stroke={S} strokeWidth="1.5" />

      {/* Eye dots */}
      <circle cx="141" cy="51" r="4.5" fill={eyeFill} />
      <circle cx="159" cy="51" r="4.5" fill={eyeFill} />
      <circle cx="141" cy="51" r="1.8" fill={BG} />
      <circle cx="159" cy="51" r="1.8" fill={BG} />

      {/* ── Zone overlays (hit areas) ── */}
      {/* Bones: arms + legs */}
      <g {...zoneHandlers('bones')}>
        <rect x="83" y="92" width="27" height="78" rx="6" style={zoneStyle('bones')} />
        <rect x="190" y="92" width="27" height="78" rx="6" style={zoneStyle('bones')} />
        <rect x="112" y="185" width="24" height="112" rx="6" style={zoneStyle('bones')} />
        <rect x="164" y="185" width="24" height="112" rx="6" style={zoneStyle('bones')} />
      </g>
      {/* Heart: left torso */}
      <rect x="108" y="91" width="46" height="56" {...zoneHandlers('heart')} style={zoneStyle('heart')} />
      {/* Brain: upper head */}
      <ellipse cx="150" cy="43" rx="22" ry="20" {...zoneHandlers('brain')} style={zoneStyle('brain')} />
      {/* Eyes: full head */}
      <ellipse cx="150" cy="51" rx="25" ry="30" {...zoneHandlers('eyes')} style={zoneStyle('eyes')} />

      {/* ── Left-side labels with leader lines ── */}
      {/* Brain */}
      <line x1="82" y1="32" x2="131" y2="32" stroke={LINE} strokeWidth="0.75" />
      <text x="79" y="36" textAnchor="end" fontSize="11" fill={S} fontFamily="IBM Plex Mono, monospace">Brain</text>

      {/* Heart */}
      <line x1="82" y1="128" x2="108" y2="128" stroke={LINE} strokeWidth="0.75" />
      <text x="79" y="132" textAnchor="end" fontSize="11" fill={S} fontFamily="IBM Plex Mono, monospace">Heart</text>

      {/* ── Right-side labels with leader lines ── */}
      {/* Eyes (status swatch + label) */}
      <line x1="175" y1="51" x2="213" y2="51" stroke={eyeFill} strokeWidth="0.75" />
      <circle cx="218" cy="51" r="4" fill={eyeFill} />
      <text x="225" y="55" textAnchor="start" fontSize="11" fill={eyeFill} fontFamily="IBM Plex Mono, monospace">
        {eyesLevel ? getStatus(eyesLevel).label : 'Eyes'}
      </text>

      {/* Bones & muscles */}
      <line x1="217" y1="134" x2="222" y2="134" stroke={LINE} strokeWidth="0.75" />
      <text x="224" y="130" textAnchor="start" fontSize="10.5" fill={S} fontFamily="IBM Plex Mono, monospace">Bones &amp;</text>
      <text x="224" y="144" textAnchor="start" fontSize="10.5" fill={S} fontFamily="IBM Plex Mono, monospace">muscles</text>
    </svg>
  )
}

function ZoneContent({ zone, zoneKey, status }) {
  if (!zone) return null
  const isEyes = zoneKey === 'eyes'
  const Icon = ZONE_ICONS[zoneKey]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--muted)' }} />}
        <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{zone.label}</h2>
        {isEyes && status && <StatusBadge level={status.level} />}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-mono text-xs mb-1" style={{ color: 'var(--dim)' }}>What it does</p>
          <p className="leading-relaxed" style={{ color: 'var(--text)' }}>{zone.what}</p>
        </div>
        <div>
          <p className="font-mono text-xs mb-1" style={{ color: 'var(--dim)' }}>In spaceflight</p>
          <p className="leading-relaxed" style={{ color: 'var(--text)' }}>{zone.spaceflight}</p>
        </div>
        <div>
          <p className="font-mono text-xs mb-1" style={{ color: 'var(--dim)' }}>
            {isEyes ? 'What to do' : 'Status'}
          </p>
          <p className="leading-relaxed" style={{ color: 'var(--text)' }}>{zone.getActions(status)}</p>
        </div>
        {isEyes && status?.reason && (
          <div>
            <p className="font-mono text-xs mb-1" style={{ color: 'var(--dim)' }}>Current note</p>
            <p className="leading-relaxed italic" style={{ color: 'var(--text)' }}>{status.reason}</p>
          </div>
        )}
        {!isEyes && (
          <p className="text-xs italic" style={{ color: 'var(--dim)' }}>Module coming soon.</p>
        )}
      </div>
    </div>
  )
}

function ZoneDrawer({ zone, zoneKey, status, onClose }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(15,16,13,0.75)' }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '75vh',
          borderTop: '1px solid var(--line)',
          backgroundColor: 'var(--surface)',
          zIndex: 50,
          overflowY: 'auto',
        }}
      >
        <div className="p-5">
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="transition-colors duration-150"
              style={{ color: 'var(--dim)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--dim)')}
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
          <ZoneContent zone={zone} zoneKey={zoneKey} status={status} />
        </div>
      </div>
    </>
  )
}

function ActionButtons({ id, status, navigate }) {
  const isAlert = status?.level === 'AMBER' || status?.level === 'RED'
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => navigate(`/astronaut/${id}/test`)} className="w-full">
        {isAlert ? 'Retest now' : 'Start eye test'}
      </Button>
      <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
        Switch crew member
      </Button>
    </div>
  )
}

export default function BodyMap() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [astronaut, setAstronaut] = useState(null)
  const [error, setError] = useState(null)
  const [activeZone, setActiveZone] = useState('eyes')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = () => {
    setError(null)
    getAstronaut(id).then(setAstronaut).catch(setError)
  }

  useEffect(load, [id])

  const status = astronaut?.latest_status ?? null

  function handleZoneClick(zoneKey) {
    setActiveZone(zoneKey)
    setDrawerOpen(true)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <Header astronaut={astronaut} backTo="/" />

      {!astronaut && !error && <Loading label="Loading…" />}
      {error && <ErrorBox error={error} onRetry={load} />}

      {astronaut && (
        <main className="max-w-5xl mx-auto px-4 pt-6 pb-16">

          {/* Eyes status card — always visible above figure */}
          <div
            className="p-4 mb-6"
            style={{ border: '1px solid var(--line)', backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Eyes</span>
              {status ? <StatusBadge level={status.level} /> : (
                <span className="font-mono text-sm" style={{ color: 'var(--dim)' }}>No data yet</span>
              )}
            </div>
            {status?.reason && (
              <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--text)' }}>{status.reason}</p>
            )}
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--dim)' }}>Next test due</span>
              <span className="font-mono" style={{ color: 'var(--muted)' }}>{astronaut.next_test_due ?? '—'}</span>
            </div>
          </div>

          {/* Two-column layout on desktop */}
          <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10 lg:items-start">

            {/* Figure */}
            <div className="flex justify-center">
              <HumanFigure
                eyesLevel={status?.level}
                activeZone={activeZone}
                onZone={handleZoneClick}
              />
            </div>

            {/* Right panel: zone info + actions (desktop only) */}
            <div className="hidden lg:flex lg:flex-col lg:gap-6">
              <div
                className="p-5"
                style={{ border: '1px solid var(--line)', backgroundColor: 'var(--surface)' }}
              >
                <ZoneContent zone={ZONES[activeZone]} zoneKey={activeZone} status={status} />
              </div>
              <ActionButtons id={id} status={status} navigate={navigate} />
            </div>
          </div>

          {/* Mobile: actions below figure */}
          <div className="lg:hidden mt-6">
            <ActionButtons id={id} status={status} navigate={navigate} />
          </div>

          {/* Mobile: zone drawer */}
          {drawerOpen && (
            <div className="lg:hidden">
              <ZoneDrawer
                zone={ZONES[activeZone]}
                zoneKey={activeZone}
                status={status}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          )}
        </main>
      )}
    </div>
  )
}
