import { useId } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Backspace,
  BookOpenText,
  Brain,
  Broadcast,
  CalendarBlank,
  ChartLineUp,
  Check,
  CheckCircle,
  Clock,
  Eye,
  Flame,
  Heartbeat,
  House,
  Info,
  LockKey,
  Medal,
  MinusCircle,
  MoonStars,
  Plus,
  Printer,
  SignOut,
  UsersThree,
  Warning,
  WarningOctagon,
  Wind,
  X,
} from '@phosphor-icons/react'

/*
 * App icons come from Phosphor Icons (https://phosphoricons.com, MIT licence).
 * Duotone for navigation and content icons, bold for small controls and status shapes.
 * They inherit colour from the text (currentColor) and are hidden from screen readers,
 * because a text label always sits next to them. Size them with a class, e.g. "size-5".
 */
function icon(Component, weight = 'duotone') {
  const Wrapped = ({ className = 'size-6', ...rest }) => (
    <Component weight={weight} className={className} aria-hidden="true" focusable="false" {...rest} />
  )
  Wrapped.displayName = `${Component.displayName ?? 'Icon'}Icon`
  return Wrapped
}

// Each status has a different SHAPE so it can be told apart without colour.
export function StatusIcon({ level, className = 'size-6' }) {
  const props = { weight: 'bold', className, 'aria-hidden': true, focusable: 'false' }
  if (level === 'GREEN') return <CheckCircle {...props} />
  if (level === 'AMBER') return <Warning {...props} />
  if (level === 'RED') return <WarningOctagon {...props} />
  return <MinusCircle {...props} />
}

export const EyeIcon = icon(Eye)
export const HeartIcon = icon(Heartbeat)
export const MoonIcon = icon(MoonStars)
export const MindIcon = icon(Brain)
export const HomeIcon = icon(House)
export const ChartIcon = icon(ChartLineUp)
export const UsersIcon = icon(UsersThree)
export const BookIcon = icon(BookOpenText)
export const LogoutIcon = icon(SignOut)
export const ArrowLeftIcon = icon(ArrowLeft, 'bold')
export const ArrowRightIcon = icon(ArrowRight, 'bold')
export const CloseIcon = icon(X, 'bold')
export const BackspaceIcon = icon(Backspace)
export const InfoIcon = icon(Info)
export const CheckIcon = icon(Check, 'bold')
export const PlusIcon = icon(Plus, 'bold')
export const PrinterIcon = icon(Printer)
export const FlameIcon = icon(Flame)
export const CalendarIcon = icon(CalendarBlank)
export const ClockIcon = icon(Clock)
export const BroadcastIcon = icon(Broadcast)
export const LockIcon = icon(LockKey)
export const AwardIcon = icon(Medal)
export const WindIcon = icon(Wind)

/**
 * The Sightline mark: a geometric eye crossed by an orbit, on a violet tile.
 * Drawn as a vector so it stays sharp at every size (the same artwork is public/favicon.svg).
 * Decorative: the brand name always sits next to it as text. Size it by height, e.g. "h-8 w-auto".
 */
export function LogoMark({ className = 'h-8 w-auto' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.3" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id}-tile)`} />
      <rect width="40" height="40" rx="11" fill={`url(#${id}-shine)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="none" stroke="#fff" strokeOpacity="0.18" />
      {/* orbit behind the eye */}
      <ellipse cx="20" cy="20" rx="14.5" ry="5.2" transform="rotate(-28 20 20)" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.3" />
      {/* the eye */}
      <path d="M7.5 20C12 13.4 28 13.4 32.5 20C28 26.6 12 26.6 7.5 20Z" fill="#2e1065" fillOpacity="0.35" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="4.3" fill="#fff" />
      <circle cx="20" cy="20" r="1.7" fill="#5b21b6" />
      {/* the satellite on its orbit */}
      <circle cx="28.2" cy="11.8" r="1.7" fill="#fff" />
    </svg>
  )
}
