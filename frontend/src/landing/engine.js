/*
 * Scroll engine for the Sightline landing page.
 *
 * - The hero maps scroll progress (0..1 through the pinned section) to an eased
 *   zoom into the pupil of the eye photo. Progress is lerped in a rAF loop that
 *   rests when converged and stops while the hero is off-screen.
 * - Every DOM write is delta-gated: nothing is touched unless its value changed.
 * - Caption bands are paced in scroll distance with smoothstep ramps and a --k
 *   assembly variable that the CSS entrances run on.
 * - Below the hero everything is still; sections only fade in once.
 * - Reduced motion is honoured live, in both directions.
 *
 * initLanding(root) returns a cleanup function (React effects call it on unmount).
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const smoothstep = (p, e0, e1) => {
  const t = clamp((p - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
const REDUCED = '(prefers-reduced-motion: reduce)'
const ZOOM_MAX = 46 // how far the dive magnifies the hero image by the time it reaches the pupil

export function initLanding(root) {
  if (!root) return () => {}
  const cleanups = []
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }

  const html = document.documentElement
  html.classList.add('lp-html')
  cleanups.push(() => html.classList.remove('lp-html'))

  const reducedMql = matchMedia(REDUCED)
  let reduced = reducedMql.matches

  /* ───────────── Fixed environment: a still starfield, painted once (and on resize) ───────────── */

  const starCanvases = [...root.querySelectorAll('[data-stars]')]
  function paintStars() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    starCanvases.forEach((c) => {
      const layer = c.dataset.stars === 'near' ? 1 : 0
      const w = innerWidth
      const h = innerHeight
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
      c.style.width = `${w}px`
      c.style.height = `${h}px`
      const ctx = c.getContext('2d')
      ctx.scale(dpr, dpr)
      // Seeded so the sky is the same on every load.
      let s = layer ? 913 : 271
      const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
      const count = Math.round(((w * h) / 9000) * (layer ? 0.35 : 1))
      for (let i = 0; i < count; i++) {
        const x = r() * w
        const y = r() * h
        const size = layer ? 0.8 + r() * 1.3 : 0.35 + r() * 0.8
        const alpha = layer ? 0.45 + r() * 0.5 : 0.18 + r() * 0.45
        const tint = r()
        ctx.fillStyle =
          tint > 0.82 ? `rgba(205,225,215,${alpha})` : tint > 0.7 ? `rgba(255,236,220,${alpha})` : `rgba(240,244,242,${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }
  paintStars()

  /* ───────────── Hero ───────────── */

  const hero = root.querySelector('[data-hero]')
  const stage = root.querySelector('[data-stage]')
  const eye = root.querySelector('[data-eye]')
  const deep = root.querySelector('[data-deep]')
  const bands = [...root.querySelectorAll('[data-band]')].map((el, i, all) => ({
    el,
    a: Number(el.dataset.a),
    b: Number(el.dataset.b),
    ramp: el.dataset.ramp ? Number(el.dataset.ramp) : null,
    first: i === 0,
    last: i === all.length - 1,
    op: -1,
    k: -1,
  }))

  const cache = new Map() // element -> last written string, per property
  function write(el, prop, value) {
    const key = cache.get(el) || {}
    if (key[prop] === value) return
    key[prop] = value
    cache.set(el, key)
    if (prop.startsWith('--')) el.style.setProperty(prop, value)
    else el.style[prop] = value
  }

  function heroProgress() {
    const rect = hero.getBoundingClientRect()
    const range = rect.height - innerHeight
    return range > 0 ? clamp(-rect.top / range, 0, 1) : 0
  }

  // Pointer parallax for the opening frames (eased, never snaps).
  let ptx = 0
  let pty = 0
  let px = 0
  let py = 0

  // Band one assembles on load, then hands over to scroll.
  const loadStart = performance.now()
  let loadK = reduced ? 1 : 0

  function applyHero(p) {
    // Zoom: an eased exponential dive that reaches the pupil by 0.84.
    const e = smoothstep(p, 0, 0.84)
    // The hero eye is small in its image (pupil about 4% of it), so the dive zooms deep to enter it.
    const scale = 1.06 * Math.pow(ZOOM_MAX / 1.06, e)
    const calm = 1 - e
    const tx = -px * 14 * calm
    const ty = -py * 10 * calm
    write(eye, 'transform', `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${scale.toFixed(4)}) rotate(${(p * 5).toFixed(2)}deg)`)
    // The eye fades into the page's real starfield as we pass into the pupil.
    write(eye, 'opacity', (1 - smoothstep(p, 0.62, 0.82)).toFixed(3))
    write(deep, 'opacity', smoothstep(p, 0.66, 0.9).toFixed(3))
    write(deep, 'transform', `scale(${(1.25 - 0.25 * smoothstep(p, 0.66, 1)).toFixed(4)})`)

    // Caption bands.
    bands.forEach((band) => {
      const { a, b } = band
      const f = Math.min(0.02, (b - a) / 3)
      let op = smoothstep(p, a, a + f) * (1 - smoothstep(p, b - f, b))
      if (band.first) op = 1 - smoothstep(p, b - f, b)
      if (band.last) op = smoothstep(p, a, a + f)
      let k = clamp((p - a) / (band.ramp || Math.min(0.025, (b - a) * 0.35)), 0, 1)
      if (band.first) k = Math.max(k, loadK)
      const opR = Math.round(op * 1000) / 1000
      if (opR !== band.op) {
        band.op = opR
        band.el.style.opacity = opR
        band.el.style.visibility = opR < 0.002 ? 'hidden' : 'visible'
        band.el.classList.toggle('live', opR > 0.5)
      }
      if (Math.abs(k - band.k) > 0.008 || (k === 1 && band.k !== 1) || (k === 0 && band.k !== 0)) {
        band.k = k
        band.el.style.setProperty('--k', k.toFixed(3))
      }
    })

  }

  let target = 0
  let shown = 0
  let rafId = null
  let lastTick = 0
  let heroOnScreen = true
  let scrubOn = false

  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now))
    lastTick = now
    const k = 0.14
    const f = 1 - Math.pow(1 - k, dt / 16.667)
    shown += (target - shown) * f
    px += (ptx - px) * f * 0.6
    py += (pty - py) * f * 0.6
    if (loadK < 1) loadK = smoothstep(now - loadStart, 150, 1500)

    const settled =
      Math.abs(target - shown) < 0.0004 && Math.abs(ptx - px) < 0.002 && Math.abs(pty - py) < 0.002 && loadK >= 1
    if (settled) {
      shown = target
      rafId = null
      lastTick = 0
    } else {
      rafId = requestAnimationFrame(tick)
    }
    applyHero(shown)
  }

  function kick() {
    if (rafId === null && heroOnScreen && scrubOn) rafId = requestAnimationFrame(tick)
  }

  function onHeroScroll() {
    target = heroProgress()
    kick()
  }

  function onPointer(e) {
    if (e.pointerType !== 'mouse') return
    ptx = (e.clientX / innerWidth) * 2 - 1
    pty = (e.clientY / innerHeight) * 2 - 1
    kick()
  }

  const heroIO = new IntersectionObserver(([entry]) => {
    heroOnScreen = entry.isIntersecting
    if (heroOnScreen) onHeroScroll()
  })
  heroIO.observe(hero)
  cleanups.push(() => heroIO.disconnect())

  function enableScrub() {
    if (scrubOn) return
    scrubOn = true
    root.classList.remove('is-static')
    bands.forEach((b) => {
      b.op = -1
      b.k = -1
    })
    cache.clear()
    target = shown = heroProgress()
    addEventListener('scroll', onHeroScroll, { passive: true })
    addEventListener('pointermove', onPointer, { passive: true })
    applyHero(shown)
    kick()
  }
  function disableScrub() {
    // The static hero class goes on even if the scrub never started (reduced motion at load).
    root.classList.add('is-static')
    if (!scrubOn) return
    scrubOn = false
    removeEventListener('scroll', onHeroScroll)
    removeEventListener('pointermove', onPointer)
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
    root.classList.add('is-static')
  }
  cleanups.push(disableScrub)

  /* ───────────── Below the hero: the nav darkens once the page scrolls ───────────── */

  const nav = root.querySelector('[data-nav]')
  let pageRaf = null

  function updatePage() {
    pageRaf = null
    nav.classList.toggle('solid', scrollY > 40)
  }
  function onPageScroll() {
    if (pageRaf === null) pageRaf = requestAnimationFrame(updatePage)
  }
  on(window, 'scroll', onPageScroll, { passive: true })
  cleanups.push(() => pageRaf !== null && cancelAnimationFrame(pageRaf))
  updatePage()

  /* ───────────── Entrances: each section fades in once ───────────── */

  const timers = []
  cleanups.push(() => timers.forEach(clearTimeout))

  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target
        el.classList.add('in')
        revealIO.unobserve(el)
        // Retire the stagger delays once the entrance is over, so hovers respond at once.
        timers.push(setTimeout(() => el.classList.add('settled'), 1600))
      })
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
  )
  root.querySelectorAll('[data-reveal]').forEach((el) => revealIO.observe(el))
  cleanups.push(() => revealIO.disconnect())

  /* ───────────── Reduced motion, live in both directions ───────────── */

  function pinToFinalStates() {
    root.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in', 'settled'))
    updatePage()
  }
  function applyMode() {
    reduced = reducedMql.matches
    if (reduced) {
      disableScrub()
      loadK = 1
      pinToFinalStates()
    } else {
      enableScrub()
      updatePage()
    }
  }
  on(reducedMql, 'change', applyMode)
  applyMode()

  /* ───────────── Housekeeping ───────────── */

  // Pause every CSS loop while the tab is hidden.
  const onVisibility = () => document.body.classList.toggle('lp-paused', document.hidden)
  on(document, 'visibilitychange', onVisibility)
  cleanups.push(() => document.body.classList.remove('lp-paused'))

  let resizeT = null
  on(window, 'resize', () => {
    clearTimeout(resizeT)
    resizeT = setTimeout(() => {
      paintStars()
      onHeroScroll()
      updatePage()
    }, 150)
  })
  cleanups.push(() => clearTimeout(resizeT))

  // The page eases in.
  requestAnimationFrame(() => root.classList.add('ready'))

  return () => {
    cleanups.reverse().forEach((fn) => fn())
    root.classList.remove('ready', 'is-static')
  }
}
