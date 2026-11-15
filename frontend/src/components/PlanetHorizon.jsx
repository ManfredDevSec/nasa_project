import { useEffect, useId, useState } from 'react'

// The curve the moon travels on (also drawn as the dotted orbit line).
const ORBIT = 'M10 60 Q240 -10 470 60'

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * Decorative planet horizon: the lit edge of a planet, a faint dotted orbit above it and a small moon
 * that glides from side to side along that orbit. Used on the sign-in page and the landing page.
 * The moon holds still when the visitor asks for reduced motion.
 */
export default function PlanetHorizon({ className = 'w-full max-w-md', duration = 16 }) {
  const id = useId().replace(/:/g, '')
  const reduced = usePrefersReducedMotion()

  return (
    <svg viewBox="0 0 480 120" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-limb`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#a78bfa" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
        {/* the planet fades out at the bottom instead of ending in a hard edge */}
        <linearGradient id={`${id}-fade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.55" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="480" height="120">
          <rect width="480" height="120" fill={`url(#${id}-fade)`} />
        </mask>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#ddd6fe" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ddd6fe" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g mask={`url(#${id}-mask)`}>
        <ellipse cx="240" cy="190" rx="300" ry="110" fill={`url(#${id}-limb)`} />
        <ellipse cx="240" cy="192" rx="300" ry="110" fill="#080516" />
      </g>
      <path d={ORBIT} fill="none" stroke="#4a3d85" strokeDasharray="3 6" />

      {reduced ? (
        <g transform="translate(352 27)">
          <circle r="11" fill={`url(#${id}-glow)`} />
          <circle r="4" fill="#f7f6fd" />
        </g>
      ) : (
        <g>
          <circle r="11" fill={`url(#${id}-glow)`} />
          <circle r="4" fill="#f7f6fd" />
          {/* glide along the orbit and back, easing at each end */}
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            path={ORBIT}
            keyPoints="0.08;0.92;0.08"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          />
        </g>
      )}
    </svg>
  )
}
