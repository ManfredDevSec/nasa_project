import { useEffect, useRef } from 'react'
import BodyFigure from './BodyFigure.jsx'

/**
 * The body map stage: the app's own drawn body figure (BodyFigure, made in code) standing on a
 * light platform. It floats gently, tilts a little toward the mouse, and a cyan scan line sweeps
 * over it. Each body part is still a focusable button outlined in its status colour.
 * Same props as BodyFigure.
 */
export default function BodyMapScene({ parts, selected, onSelect }) {
  const wrapRef = useRef(null)
  const tiltRef = useRef(null)

  // A slight 3D tilt toward the pointer, eased, transform only; rests when it settles.
  useEffect(() => {
    const wrap = wrapRef.current
    const tilt = tiltRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    let raf = null
    let last = ''
    function tick() {
      raf = null
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      const value = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg)`
      if (value !== last) {
        last = value
        tilt.style.transform = value
      }
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) raf = requestAnimationFrame(tick)
    }
    const kick = () => raf === null && (raf = requestAnimationFrame(tick))
    function onMove(e) {
      if (reduce.matches || e.pointerType !== 'mouse') return
      const r = wrap.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width) * 2 - 1
      ty = ((e.clientY - r.top) / r.height) * 2 - 1
      kick()
    }
    function onLeave() {
      tx = 0
      ty = 0
      kick()
    }
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)
    return () => {
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative mx-auto h-[26rem] w-full select-none [perspective:900px] md:h-[30rem]">
      {/* Light platform under the feet */}
      <div aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1/2 h-10 w-48 -translate-x-1/2 translate-y-1/3">
        <span className="absolute inset-0 rounded-[50%] bg-[radial-gradient(closest-side,rgb(52_221_239/0.35),transparent)]" />
        <span className="absolute inset-x-5 inset-y-2 rounded-[50%] border border-sky-400/60 shadow-[0_0_18px_rgb(52_221_239/0.5)]" />
        <span className="absolute inset-0 rounded-[50%] border border-sky-400/25" />
      </div>

      <div ref={tiltRef} className="relative mx-auto h-full w-fit will-change-transform">
        <div className="scene-float relative h-full drop-shadow-[0_0_18px_rgb(52_221_239/0.18)]">
          <BodyFigure parts={parts} selected={selected} onSelect={onSelect} />
          {/* Scan line sweeping over the figure */}
          <div aria-hidden="true" className="scene-scan-mask pointer-events-none absolute inset-0">
            <span className="scene-scan absolute inset-x-0 h-[14%]" />
          </div>
        </div>
      </div>
    </div>
  )
}
