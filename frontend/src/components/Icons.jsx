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
 * The Sightline mark: a glossy 3D eye with an orbit ring passing behind and in front of it,
 * on a transparent background. Vector, so it stays sharp at every size
 * (the same artwork, on a square canvas, is public/favicon.svg and public/sightline-logo.png).
 * Decorative: the brand name always sits next to it as text. Size it by height, e.g. "h-8 w-auto".
 */
export function LogoMark({ className = 'h-8 w-auto' }) {
  const id = useId().replace(/:/g, '')
  const u = (name) => `url(#${id}-${name})`
  return (
    <svg viewBox="2 10 60 45" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-ringBack`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b21b6" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id={`${id}-ringFront`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.45" stopColor="#ede9fe" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ede9fe" />
          <stop offset="0.45" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <radialGradient id={`${id}-socket`} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#3b1a85" />
          <stop offset="0.7" stopColor="#1e0b4b" />
          <stop offset="1" stopColor="#0f0529" />
        </radialGradient>
        <radialGradient id={`${id}-iris`} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#f5f3ff" />
          <stop offset="0.28" stopColor="#c4b5fd" />
          <stop offset="0.62" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#2e1065" />
        </radialGradient>
        <radialGradient id={`${id}-pupil`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#2e1065" />
          <stop offset="1" stopColor="#07021a" />
        </radialGradient>
        <radialGradient id={`${id}-moon`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#ddd6fe" />
          <stop offset="1" stopColor="#6d28d9" />
        </radialGradient>
        <filter id={`${id}-lift`} x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#1e0b4b" floodOpacity="0.55" />
        </filter>
      </defs>
      <g filter={u('lift')}>
        {/* back half of the orbit, behind the eye */}
        <path d="M5 32A27 9.5 0 0 1 59 32" transform="rotate(-28 32 32)" fill="none" stroke={u('ringBack')} strokeWidth="2.6" opacity="0.85" />
        {/* satellite riding the back of the orbit */}
        <circle cx="49" cy="16.8" r="3.3" fill={u('moon')} />
        <circle cx="47.9" cy="15.7" r="0.9" fill="#fff" opacity="0.9" />
        {/* the eye: a domed socket inside a bevelled rim */}
        <path d="M9 32C16.5 19.5 47.5 19.5 55 32C47.5 44.5 16.5 44.5 9 32Z" fill={u('socket')} stroke={u('rim')} strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M12.2 30.6C19.5 21.6 44.5 21.6 51.8 30.6" fill="none" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
        {/* iris sphere, pupil and catch-lights */}
        <circle cx="32" cy="32" r="9.2" fill={u('iris')} />
        <circle cx="32" cy="32" r="9.2" fill="none" stroke="#1e0b4b" strokeWidth="0.8" opacity="0.6" />
        <circle cx="32" cy="32" r="3.9" fill={u('pupil')} />
        <ellipse cx="28.6" cy="28.4" rx="2.1" ry="1.5" transform="rotate(-30 28.6 28.4)" fill="#fff" opacity="0.95" />
        <circle cx="35.6" cy="35.4" r="0.8" fill="#fff" opacity="0.55" />
        {/* front half of the orbit, passing over the eye */}
        <path d="M59 32A27 9.5 0 0 1 5 32" transform="rotate(-28 32 32)" fill="none" stroke={u('ringFront')} strokeWidth="2.6" />
        <path d="M57.6 32.6A25.8 8.6 0 0 1 6.4 32.6" transform="rotate(-28 32 32)" fill="none" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      </g>
    </svg>
  )
}
