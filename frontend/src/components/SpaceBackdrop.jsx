import { useEffect, useRef } from 'react'

/**
 * The fixed "one environment" layer behind the signed-in app, shared in spirit with
 * the landing page: soft iris-blue glows, a starfield painted once onto a canvas,
 * and a little grain. Nothing here redraws per frame; the photo flies forward on a slow
 * two-layer loop and the glow drifts (both stopped by reduced motion) and the stars repaint only on resize.
 */
export default function SpaceBackdrop() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    function paint() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      let s = 4127 // seeded, so the sky is the same on every screen
      const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
      const count = Math.round((w * h) / 22000) // a sparse near layer; the photo carries the faint stars
      for (let i = 0; i < count; i++) {
        const big = r() > 0.92
        const alpha = big ? 0.5 + r() * 0.4 : 0.12 + r() * 0.35
        ctx.fillStyle = r() > 0.8 ? `rgba(210,190,255,${alpha})` : `rgba(241,235,255,${alpha})`
        ctx.beginPath()
        ctx.arc(r() * w, r() * h, big ? 0.9 + r() * 0.8 : 0.3 + r() * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    paint()
    let t = null
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(paint, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div
      className="space-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden="true"
      style={{
        '--space-lg': `url('${import.meta.env.BASE_URL}landing/space-hubble-udf.jpg')`,
        '--space-sm': `url('${import.meta.env.BASE_URL}landing/space-hubble-udf-sm.jpg')`,
      }}
    >
      {/* Real space: the Hubble Ultra Deep Field (NASA/ESA), dimmed for a data-heavy screen */}
      <div className="absolute -inset-[6%]">
        <div className="space-photo absolute inset-0" />
        <div className="space-photo space-photo-b absolute inset-0" />
      </div>
      <div className="space-shade absolute inset-0" />
      {/* Aurora light curtains, kept dim behind data screens */}
      <div className="aurora" style={{ '--aurora': 0.38 }}>
        <div className="aurora-layer aurora-a" />
        <div className="aurora-layer aurora-b" />
      </div>
      <div className="space-glow absolute -inset-[20%]" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="space-grain absolute inset-0" />
    </div>
  )
}
