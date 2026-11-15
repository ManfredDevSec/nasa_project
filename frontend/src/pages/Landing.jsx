import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark, StatusIcon } from '../components/Icons.jsx'
import PlanetHorizon from '../components/PlanetHorizon.jsx'
import { getToken, getUser, homePathFor } from '../utils/auth.js'
import { initLanding } from '../landing/engine.js'
import '../landing/landing.css'

/*
 * The public Sightline landing page: a scroll-driven intro followed by the product sections.
 *
 * The page is written as plain HTML markup here; React only renders it once and
 * hands the DOM to the vanilla scroll engine in ../landing/engine.js, which drives
 * the hero zoom, the caption bands, the drawn lines, the counters and the
 * hold-to-scan moment. Copy comes verbatim from docs/landing-design-package.md.
 */

// Seeded pseudo-random numbers, so the scattered letters land the same on every load.
function rng(seed) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}

/**
 * Splits a line into word (.w) and character (.c) spans for the scroll entrances.
 * Screen readers get the plain sentence; the split copy is hidden from them.
 *  mode 'words': each word gets an ordered threshold (--th)
 *  mode 'grid':  each character slides in from the side, in reading order
 */
function Split({ text, mode = 'words', seed = 1, spread = 0.5 }) {
  const rand = rng(seed)
  const words = text.split(' ')
  const totalChars = text.replace(/ /g, '').length
  let charIndex = 0
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="split">
        {words.map((word, wi) => {
          const wordStyle = { '--th': ((wi / Math.max(1, words.length)) * spread).toFixed(3) }
          return (
            <span key={wi}>
              <span className="w" style={wordStyle}>
                {mode === 'grid'
                  ? [...word].map((ch, ci) => {
                      const th = (charIndex++ / totalChars) * spread + rand() * 0.06
                      return (
                        <span
                          key={ci}
                          className="c"
                          style={{ '--th': th.toFixed(3), '--jx': `${Math.round(18 + rand() * 26)}px` }}
                        >
                          {ch}
                        </span>
                      )
                    })
                  : word}
              </span>
              {wi < words.length - 1 ? ' ' : null}
            </span>
          )
        })}
      </span>
    </>
  )
}

// Reticle rings and tick marks that draw themselves over the pupil as you scroll.
function Reticle() {
  const ticks = Array.from({ length: 24 }, (_, i) => i)
  return (
    <svg className="reticle" data-reticle viewBox="-200 -200 400 400" aria-hidden="true">
      <circle r="118" pathLength="1" data-draw="0.18 0.40" className="ret-line" />
      <circle r="150" pathLength="1" data-draw="0.26 0.50" className="ret-line ret-faint" strokeDasharray="0.004 0.012" />
      <circle r="182" pathLength="1" data-draw="0.34 0.62" className="ret-line" />
      {ticks.map((i) => {
        const a = (i / ticks.length) * Math.PI * 2
        const long = i % 6 === 0
        const r1 = long ? 160 : 170
        return (
          <line
            key={i}
            x1={Math.cos(a) * r1}
            y1={Math.sin(a) * r1}
            x2={Math.cos(a) * 182}
            y2={Math.sin(a) * 182}
            pathLength="1"
            data-draw={`${(0.42 + i * 0.008).toFixed(3)} ${(0.47 + i * 0.008).toFixed(3)}`}
            className="ret-line"
          />
        )
      })}
      <path d="M-200 0H-130M130 0H200M0 -200V-130M0 130V200" pathLength="1" data-draw="0.30 0.58" className="ret-line" />
    </svg>
  )
}

// The four tests, each with its own small drawn illustration.
const STEPS = [
  { name: 'Near vision', text: 'Read the letters, line by line, one eye at a time.', art: NearArt },
  { name: 'Amsler grid', text: 'Look at the dot and mark any lines that look wavy or bent.', art: AmslerArt },
  { name: 'Contrast', text: 'The letters get fainter each time. Guess if you are not sure.', art: ContrastArt },
  { name: 'Symptoms', text: 'Rate headache, eye pressure and blurry vision.', art: SymptomArt },
]

const RESULTS = [
  { level: 'GREEN', word: 'All clear' },
  { level: 'AMBER', word: 'Watch' },
  { level: 'RED', word: 'Act now' },
]

const READOUTS = [
  { value: 7, label: 'days between checks' },
  { value: 2, label: 'eyes, one at a time' },
  { value: 4, label: 'short tests' },
  { value: 3, label: 'possible results' },
]

export default function Landing() {
  const rootRef = useRef(null)
  const user = getToken() ? getUser() : null
  const appPath = user ? homePathFor(user) : '/login'
  const ctaLabel = 'Open Sightline'

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Sightline, the weekly eye check for long missions'
    const cleanup = initLanding(rootRef.current)
    return () => {
      cleanup()
      document.title = prevTitle
    }
  }, [])

  return (
    <div className="lp" ref={rootRef}>
      <a href="#main" className="lp-skip">
        Skip to content
      </a>

      {/* One environment behind the whole page: drifting stars and a little grain */}
      <div
        className="lp-env"
        aria-hidden="true"
        style={{
          '--space-lg': `url('${import.meta.env.BASE_URL}landing/space-hubble-udf.jpg')`,
          '--space-sm': `url('${import.meta.env.BASE_URL}landing/space-hubble-udf-sm.jpg')`,
        }}
      >
        {/* Real space: the Hubble Ultra Deep Field (NASA/ESA), dimmed and tinted toward the iris */}
        <div className="lp-space-wrap" data-space>
          <div className="lp-space lp-space-a" />
          <div className="lp-space lp-space-b" />
        </div>
        <div className="lp-space-shade" />
        {/* Aurora light curtains and a faint grid over the night sky */}
        <div className="aurora" style={{ '--aurora': 0.6 }}>
          <div className="aurora-layer aurora-a" />
          <div className="aurora-layer aurora-b" />
        </div>
        <div className="aurora-grid" />
        <div className="lp-env-glow" />
        <canvas className="lp-stars lp-stars-far" data-stars="far" />
        <canvas className="lp-stars lp-stars-near" data-stars="near" />
        <div className="lp-grain" />
      </div>

      <header className="lp-nav" data-nav>
        <div className="lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="Sightline home">
            <LogoMark className="lp-logo" />
            <span>Sightline</span>
          </Link>
          <nav aria-label="Page" className="lp-nav-links">
            <a href="#risk">The risk</a>
            <a href="#how">The check</a>
            <a href="#try">Try it</a>
            <a href="#crew">Crew</a>
          </nav>
          <Link to={appPath} className="lp-btn lp-btn-primary lp-nav-cta">
            {user ? 'Open app' : 'Sign in'}
          </Link>
        </div>
      </header>

      {/* ── The hero: scroll dives into the eye and settles inside the pupil ── */}
      <section className="hero" data-hero aria-label="Introduction">
        <div className="stage" data-stage>
          <div className="eye" data-eye aria-hidden="true">
            <img className="eye-base" src={`${import.meta.env.BASE_URL}landing/astronaut-visor-eye.webp`} alt="" decoding="async" fetchPriority="high" />
            {/* The eye region at 4x detail, laid exactly over the eye so the deep zoom stays sharp */}
            <img className="eye-detail" src={`${import.meta.env.BASE_URL}landing/astronaut-visor-eye-detail.webp`} alt="" decoding="async" />
          </div>
          <div className="deep" data-deep aria-hidden="true" />
          <div className="scrim" aria-hidden="true" />
          <Reticle />

          <div className="band band-1" data-band data-a="0" data-b="0.22">
            <p className="kicker chip">Weekly eye check for long missions</p>
            <h1 className="display stack">
              <span className="sr-only">Long missions change how you see.</span>
              <span className="soft" aria-hidden="true">
                Long missions change <em>how you see.</em>
              </span>
              <span className="sharp" aria-hidden="true">
                Long missions change <em>how you see.</em>
              </span>
            </h1>
          </div>

          <div className="band band-2 fx-drift" data-band data-a="0.27" data-b="0.50">
            <h2 className="display">
              <Split text="Most changes are slow." spread={0.45} />
            </h2>
            <p className="sub">
              <Split text="Too slow to notice from one day to the next." spread={0.4} />
            </p>
          </div>

          <div className="band band-3 fx-grid" data-band data-a="0.55" data-b="0.76" data-ramp="0.034">
            <h2 className="display">
              <Split text="So you check once a week." mode="grid" seed={7} spread={0.55} />
            </h2>
            <p className="sub fade-late">Every result is compared with your own baseline.</p>
          </div>

          <div className="band band-4 fx-settle" data-band data-a="0.83" data-b="1">
            <h2 className="display big">
              <Split text="See the change early." spread={0.5} />
            </h2>
            <p className="sub stage-2">
              All clear, watch or act now, with plain reasons and next steps for the crew and the flight surgeon.
            </p>
            <div className="cta-row stage-3">
              <Link to={appPath} className="lp-btn lp-btn-primary">
                {ctaLabel}
              </Link>
              <a href="#how" className="lp-btn lp-btn-ghost">
                How it works
              </a>
            </div>
          </div>

          {/* Static hero, shown instead of the scroll journey when reduced motion is on */}
          <div className="hero-static">
            <p className="kicker chip">Weekly eye check for long missions</p>
            <h1 className="display">
              Long missions change <em>how you see.</em>
            </h1>
            <p className="sub">A short weekly eye check, compared with your own baseline.</p>
            <div className="cta-row">
              <Link to={appPath} className="lp-btn lp-btn-primary">
                {ctaLabel}
              </Link>
            </div>
          </div>

          <div className="hud chip" aria-hidden="true">
            <span className="hud-dot" />
            <span data-hud>Zoom 1.0×</span>
          </div>
          <div className="cue" aria-hidden="true">
            <span>Scroll</span>
            <span className="cue-line" />
          </div>
        </div>
      </section>

      <main id="main" tabIndex={-1} className="lp-main">
        {/* ── The risk ── */}
        <section id="risk" className="risk section" data-reveal>
          <figure className="photo risk-photo">
            <img src={`${import.meta.env.BASE_URL}landing/eye-exam-iss.jpg`} alt="An astronaut looks into an eye exam device on board the space station." loading="lazy" />
            <span className="photo-tint" aria-hidden="true" />
            <figcaption className="chip">Eye exam on board the space station</figcaption>
          </figure>
          <div className="risk-copy">
            <svg className="risk-rule" viewBox="0 0 4 400" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 0V400" pathLength="1" data-scrolldraw />
            </svg>
            <p className="kicker">The risk</p>
            <h2 className="h2">
              What space can do to <em>your eyes.</em>
            </h2>
            <p className="body">
              SANS stands for Spaceflight-Associated Neuro-ocular Syndrome. The risk is higher on longer missions, and
              how severe it is varies.
            </p>
            <p className="body">
              Sightline does not wait for symptoms. It checks every week, so a change shows up between one week and the
              next.
            </p>
          </div>
        </section>

        {/* ── Readouts ── */}
        <section className="readouts" aria-label="Sightline in numbers" data-reveal>
          {READOUTS.map((r) => (
            <div className="readout" key={r.label}>
              <span className="readout-num" data-count={r.value}>
                {r.value}
              </span>
              <span className="readout-label">{r.label}</span>
            </div>
          ))}
        </section>

        {/* ── The weekly check ── */}
        <section id="how" className="how section" data-reveal>
          <div className="how-head">
            <p className="kicker">The weekly check</p>
            <h2 className="h2">
              Four short tests. <em>One clear answer.</em>
            </h2>
          </div>
          {/* A timeline: the line draws itself down the middle as you scroll */}
          <div className="steps-wrap">
          <svg className="how-path" viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true">
            <path d="M20 0 V1000" pathLength="1" data-scrolldraw />
          </svg>
          <ol className="steps">
            {STEPS.map(({ name, text, art: Art }, i) => (
              <li className="step" key={name} style={{ '--i': i }}>
                <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="step-art">
                  <Art />
                </div>
                <h3 className="h3">{name}</h3>
                <p className="body small">{text}</p>
              </li>
            ))}
          </ol>
          </div>
        </section>

        {/* ── The one interactive moment ── */}
        <section id="try" className="try section" data-try data-reveal>
          <div className="try-copy">
            <p className="kicker">Try it</p>
            <h2 className="h2">
              Hold to run <em>a check.</em>
            </h2>
            <p className="body">
              Press and hold the scanner. Let go early and it eases back. Each result has its own shape, so it reads
              even without colour.
            </p>
          </div>

          {/* The scanner rises over a planet's horizon, with a small moon gliding along its orbit */}
          <div className="scanner-stage">
            <PlanetHorizon className="planet-scan" duration={18} />
          <button type="button" className="scanner" data-hold aria-describedby="try-status">
            <svg className="scanner-ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="92" className="ring-track" />
              <circle cx="100" cy="100" r="92" pathLength="1" className="ring-fill" />
            </svg>
            <span className="scanner-iris" aria-hidden="true">
              <img src={`${import.meta.env.BASE_URL}landing/eye-real.jpg`} alt="" loading="lazy" />
              <span className="scanner-sweep" />
            </span>
            <span className="scanner-label" data-hold-label>
              Hold to scan
            </span>
          </button>
          </div>

          <div className="results" aria-hidden="true">
            {RESULTS.map((r, i) => (
              <span className={`result result-${r.level.toLowerCase()}`} key={r.level} style={{ '--i': i }}>
                <StatusIcon level={r.level} className="result-icon" />
                {r.word}
              </span>
            ))}
          </div>
          <p id="try-status" className="verdict" aria-live="polite" data-verdict>
            <span className="verdict-idle">Not scanned yet.</span>
            <span className="verdict-done">
              <StatusIcon level="GREEN" className="verdict-icon" /> All clear. Matches your baseline.
            </span>
          </p>
        </section>

        {/* ── Who it is for ── */}
        <section id="crew" className="crew section" data-reveal>
          <div className="crew-head">
            <p className="kicker">Two sides of one mission</p>
            <h2 className="h2">
              Built for the crew, <em>and the people watching over them.</em>
            </h2>
          </div>
          <div className="crew-cards">
            <article className="crew-card crew-card-a" style={{ '--i': 0 }}>
              <div className="photo">
                <img src={`${import.meta.env.BASE_URL}landing/crew-suited.jpg`} alt="Two astronauts in white flight suits, seated and ready." loading="lazy" />
                <span className="photo-tint" aria-hidden="true" />
              </div>
              <div className="crew-text">
                <p className="kicker">For the crew</p>
                <p className="crew-line">Take the check on a tablet, see your own trend, and know what to do next.</p>
              </div>
            </article>
            <article className="crew-card crew-card-b" style={{ '--i': 1 }}>
              <div className="photo">
                <img src={`${import.meta.env.BASE_URL}landing/spacewalk.jpg`} alt="An astronaut on a spacewalk, with Earth below." loading="lazy" />
                <span className="photo-tint" aria-hidden="true" />
              </div>
              <div className="crew-text">
                <p className="kicker">For the flight surgeon</p>
                <p className="crew-line">See the whole crew at a glance, open any trend, and print the weekly report for Earth.</p>
              </div>
            </article>
          </div>
        </section>

        {/* ── The single call to action ── */}
        <section id="start" className="final" data-reveal>
          <h2 className="display big">
            Your baseline starts <em>with the first check.</em>
          </h2>
          {/* The call to action waits above a planet's horizon */}
          <div className="planet-stage">
            <PlanetHorizon className="planet-cta" duration={20} />
            <Link to={appPath} className="lp-btn lp-btn-primary lp-btn-lg planet-stage-cta">
              {ctaLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-brand">
            <LogoMark className="lp-logo" />
            <span>Sightline</span>
          </span>
          <p>Prototype, not a medical device. Simulated data.</p>
        </div>
      </footer>
    </div>
  )
}

/* ── Step illustrations: drawn in code, all on the same 120 x 80 grid ── */

function NearArt() {
  const lines = [
    { y: 18, size: 15, text: 'E F P' },
    { y: 38, size: 11, text: 'T O Z L' },
    { y: 54, size: 8, text: 'D E F P O' },
    { y: 67, size: 6, text: 'F E L O P Z' },
  ]
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      {lines.map((l, i) => (
        <text key={i} x="60" y={l.y} fontSize={l.size} textAnchor="middle" className="art-text" style={{ '--i': i }}>
          {l.text}
        </text>
      ))}
    </svg>
  )
}

function AmslerArt() {
  const cells = Array.from({ length: 7 }, (_, i) => 18 + i * 12)
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      {cells.map((x) => (
        <path key={`v${x}`} d={`M${x} 4V76`} className="art-grid" />
      ))}
      {[4, 16, 28, 40, 52, 64, 76].map((y) => (
        <path key={`h${y}`} d={`M18 ${y}H90`} className="art-grid" />
      ))}
      <path d="M18 40 C 34 40, 40 33, 48 40 S 62 47, 70 40 S 84 40, 90 40" className="art-wave" />
      <circle cx="54" cy="40" r="2.6" className="art-dot" />
    </svg>
  )
}

function ContrastArt() {
  const letters = ['H', 'V', 'Z', 'R', 'C']
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      {letters.map((l, i) => (
        <text key={l} x={16 + i * 22} y="50" fontSize="22" textAnchor="middle" className="art-text" style={{ opacity: 1 - i * 0.2 }}>
          {l}
        </text>
      ))}
    </svg>
  )
}

function SymptomArt() {
  const rows = [
    { y: 20, v: 0.15 },
    { y: 40, v: 0.5 },
    { y: 60, v: 0.3 },
  ]
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true">
      {rows.map((r, i) => (
        <g key={i}>
          <path d={`M14 ${r.y}H106`} className="art-track" />
          <path d={`M14 ${r.y}H${14 + 92 * r.v}`} className="art-fill" />
          <circle cx={14 + 92 * r.v} cy={r.y} r="5" className="art-knob" />
        </g>
      ))}
    </svg>
  )
}
