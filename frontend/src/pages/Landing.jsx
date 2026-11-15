import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Icons.jsx'
import { getToken, getUser, homePathFor } from '../utils/auth.js'
import { initLanding } from '../landing/engine.js'
import '../landing/landing.css'

/*
 * The public Sightline landing page: a scroll-driven intro followed by the product sections.
 *
 * The page is written as plain HTML markup here; React only renders it once and
 * hands the DOM to the vanilla scroll engine in ../landing/engine.js, which drives
 * the hero zoom and its caption bands. Everything below the hero is plain and still.
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

// The four tests.
const STEPS = [
  { name: 'Near vision', text: 'Read the letters, line by line, one eye at a time.' },
  { name: 'Amsler grid', text: 'Look at the dot and mark any lines that look wavy or bent.' },
  { name: 'Contrast', text: 'The letters get fainter each time. Guess if you are not sure.' },
  { name: 'Symptoms', text: 'Rate headache, eye pressure and blurry vision.' },
]

// A small printed-chart preview: Sloan letters, each row smaller (sizes in px).
const CHART = [
  { size: 44, letters: 'D K N' },
  { size: 32, letters: 'H R S V' },
  { size: 24, letters: 'Z C O N K' },
  { size: 17, letters: 'R V D S H Z' },
  { size: 12, letters: 'O K C N R V D' },
]

// Start page (from homePathFor) -> nav button label for a signed-in visitor.
const DESTINATION_LABELS = { '/home': 'My eye check', '/crew': 'Crew dashboard', '/learn': 'Learn' }

export default function Landing() {
  const rootRef = useRef(null)
  const user = getToken() ? getUser() : null
  const appPath = user ? homePathFor(user) : '/login'
  const ctaLabel = 'Open Sightline'
  // The nav button names where it goes: the sign-in page, or the signed-in user's own start page.
  const navLabel = user ? (DESTINATION_LABELS[appPath] ?? 'Continue') : 'Sign in'

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

      {/* One still environment behind the whole page: a Hubble photo, stars and a little grain */}
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
          <div className="lp-space" />
        </div>
        <div className="lp-space-shade" />
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
            <a href="#how">How it works</a>
            <a href="#crew">Crew</a>
          </nav>
          <Link to={appPath} className="lp-btn lp-btn-primary lp-nav-cta">
            {navLabel}
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

          <div className="band band-1" data-band data-a="0" data-b="0.22">
            <p className="kicker">Weekly eye check for long missions</p>
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
            <p className="kicker">Weekly eye check for long missions</p>
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

        </div>
      </section>

      <main id="main" tabIndex={-1} className="lp-main">
        {/* ── The risk ── */}
        <section id="risk" className="risk section" data-reveal>
          <figure className="photo risk-photo">
            <img src={`${import.meta.env.BASE_URL}landing/eye-exam-iss.jpg`} alt="An astronaut looks into an eye exam device on board the space station." loading="lazy" />
            <span className="photo-tint" aria-hidden="true" />
          </figure>
          <div className="risk-copy">
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

        {/* ── How it works ── */}
        <section id="how" className="how section" data-reveal>
          <div className="how-copy">
            <p className="kicker">How it works</p>
            <h2 className="h2">
              Four short tests. <em>One clear answer.</em>
            </h2>
            <ol className="how-steps">
              {STEPS.map(({ name, text }, i) => (
                <li key={name}>
                  <span className="how-num">{i + 1}</span>
                  <div>
                    <h3 className="h3">{name}</h3>
                    <p className="body small">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="body">
              Each result is compared with your own baseline and shown as all clear, watch or act now, with plain
              reasons and next steps.
            </p>
          </div>
          {/* What the test looks like: black letters on white, like a printed chart in a clinic */}
          <figure className="chart-preview">
            <div className="chart-sheet" role="img" aria-label="An eye chart: rows of letters, each row smaller than the last">
              {CHART.map((row) => (
                <p key={row.letters} style={{ fontSize: `${row.size}px` }} aria-hidden="true">
                  {row.letters}
                </p>
              ))}
            </div>
            <figcaption>The near vision test: read the smallest line you can.</figcaption>
          </figure>
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
            <article className="crew-card crew-card-a">
              <div className="photo">
                <img src={`${import.meta.env.BASE_URL}landing/crew-suited.jpg`} alt="Two astronauts in white flight suits, seated and ready." loading="lazy" />
                <span className="photo-tint" aria-hidden="true" />
              </div>
              <div className="crew-text">
                <p className="kicker">For the crew</p>
                <p className="crew-line">Take the check on a tablet, see your own trend, and know what to do next.</p>
              </div>
            </article>
            <article className="crew-card crew-card-b">
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
          <Link to={appPath} className="lp-btn lp-btn-primary lp-btn-lg">
            {ctaLabel}
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-brand">
            <LogoMark className="lp-logo" />
            <span>Sightline</span>
          </span>
          <p>Prototype, not a medical device. Simulated data.</p>
          <p className="muted">
            Image credits: Hubble Ultra Deep Field, NASA/ESA. Astronaut photos used for demonstration.
          </p>
        </div>
      </footer>
    </div>
  )
}
