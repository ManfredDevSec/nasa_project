// Simple inline SVG icons. They inherit colour from the text (currentColor)
// and are hidden from screen readers because a text label always sits next to them.
function Svg({ children, className = 'size-6', strokeWidth = 2, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

// Each status has a different SHAPE so it can be told apart without colour.
export function StatusIcon({ level, className }) {
  if (level === 'GREEN')
    return (
      <Svg className={className} strokeWidth={2.5}>
        <circle cx="12" cy="12" r="9.5" />
        <path d="m7.5 12.5 3 3 6-6.5" />
      </Svg>
    )
  if (level === 'AMBER')
    return (
      <Svg className={className} strokeWidth={2.5}>
        <path d="M12 3 22 20.5H2L12 3Z" />
        <path d="M12 10v4.5M12 17.5h.01" />
      </Svg>
    )
  if (level === 'RED')
    return (
      <Svg className={className} strokeWidth={2.5}>
        <path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2l5.7-5.7Z" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </Svg>
    )
  return (
    <Svg className={className} strokeWidth={2.5}>
      <circle cx="12" cy="12" r="9.5" strokeDasharray="3 3" />
      <path d="M8 12h8" />
    </Svg>
  )
}

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const HeartIcon = (p) => (
  <Svg {...p}>
    <path d="M12 20s-8-4.6-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.6C20 15.4 12 20 12 20Z" />
    <path d="M3.5 12h4l1.5-2.5 2.5 5 1.5-2.5h7.5" />
  </Svg>
)
export const MoonIcon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </Svg>
)
export const MindIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
  </Svg>
)
export const HomeIcon = (p) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
  </Svg>
)
export const ChartIcon = (p) => (
  <Svg {...p}>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 3 3 6-6" />
  </Svg>
)
export const UsersIcon = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
  </Svg>
)
export const BookIcon = (p) => (
  <Svg {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5v-15Z" />
    <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20" />
  </Svg>
)
export const LogoutIcon = (p) => (
  <Svg {...p}>
    <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="M10 17l-5-5 5-5M5 12h11" />
  </Svg>
)
export const ArrowLeftIcon = (p) => (
  <Svg {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Svg>
)
export const ArrowRightIcon = (p) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)
export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
export const BackspaceIcon = (p) => (
  <Svg {...p}>
    <path d="M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-6-7 6-7Z" />
    <path d="m11 9.5 5 5M16 9.5l-5 5" />
  </Svg>
)
export const InfoIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </Svg>
)
export const CheckIcon = (p) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)
export const PlusIcon = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const PrinterIcon = (p) => (
  <Svg {...p}>
    <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
    <path d="M6 14h12v7H6z" />
  </Svg>
)
export const FlameIcon = (p) => (
  <Svg {...p}>
    <path d="M12 21a7 7 0 0 0 7-7c0-4-3-6.5-4-10-2 1.5-3 3.5-3 5.5C10.5 8 9.5 7 9 6c-2 2.5-4 5-4 8a7 7 0 0 0 7 7Z" />
  </Svg>
)
export const CalendarIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
)
export const ClockIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7v5l3 2" />
  </Svg>
)
export const BroadcastIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" />
  </Svg>
)
export const LockIcon = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </Svg>
)
export const AwardIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="m8.5 14 -1.5 7 5-2.5 5 2.5-1.5-7" />
  </Svg>
)
export const WindIcon = (p) => (
  <Svg {...p}>
    <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />
  </Svg>
)

// The Sightline mark: the swirling eye from the brand logo (public/landing/logo-mark.png,
// cut out of the full logo with a transparent background). It is wider than tall (about
// 1.56 : 1), so give it a height and let the width follow, e.g. className="h-8 w-auto".
// Decorative: the brand name always sits next to it as text.
export function LogoMark({ className = 'h-8 w-auto' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}landing/logo-mark.png`}
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
      className={`${className} object-contain select-none`}
    />
  )
}
