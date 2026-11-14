import { cloneElement } from 'react'
import { PART_META } from '../utils/parts.js'
import { partLevel } from '../utils/bodyMap.js'
import { getLevel } from '../utils/status.js'

// Outline shapes for each clickable part, drawn in a 200 x 400 box.
// SLEEP is the lower body ("rest and recovery").
const SHAPES = {
  MIND: <circle cx="100" cy="58" r="42" />,
  EYES: <rect x="64" y="46" width="72" height="24" rx="12" />,
  HEART: <rect x="58" y="112" width="84" height="122" rx="26" />,
  SLEEP: <path d="M64 242H136V366A16.5 16.5 0 0 1 103 366V300H97V366A16.5 16.5 0 0 1 64 366Z" />,
}
// Drawing order matters: EYES sit on top of the head, so they come after MIND.
const DRAW_ORDER = ['MIND', 'EYES', 'HEART', 'SLEEP']

// Small symbols inside each part (decoration only).
const SYMBOLS = {
  MIND: (
    <g fill="none" stroke="#c3cae8" strokeWidth="2.5" strokeLinecap="round">
      <path d="M84 38c5-7 11-9 16-9s11 2 16 9" />
      <path d="M91 30c3-3 6-4 9-4s6 1 9 4" />
    </g>
  ),
  EYES: (
    <g fill="#f6f7fd">
      <circle cx="84" cy="58" r="5" />
      <circle cx="116" cy="58" r="5" />
    </g>
  ),
  HEART: (
    <path
      d="M100 182c-20-13-24-27-15-34 6-4 12-1 15 4 3-5 9-8 15-4 9 7 5 21-15 34Z"
      fill="none"
      stroke="#c3cae8"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  ),
  SLEEP: <path d="M106 258a12 12 0 1 0 10 18 9.5 9.5 0 0 1-10-18Z" fill="none" stroke="#c3cae8" strokeWidth="2.5" />,
}

/**
 * Simple original body figure. Each part is a focusable button outlined in its status colour.
 * `parts` is the list from the body-map API; `selected` is a part name like "EYES".
 */
export default function BodyFigure({ parts, selected, onSelect }) {

  function handleKey(e, name) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(name)
    }
  }

  return (
    <svg viewBox="0 0 200 400" className="mx-auto h-full max-h-[26rem] w-auto" role="group" aria-label="Body map">
      {/* Neck and arms: decoration, not clickable */}
      <g fill="#121935" stroke="#343c66" strokeWidth="2">
        <rect x="90" y="98" width="20" height="16" rx="4" />
        <rect x="34" y="118" width="20" height="108" rx="10" />
        <rect x="146" y="118" width="20" height="108" rx="10" />
      </g>

      {DRAW_ORDER.map((name) => {
        const level = partLevel(parts, name)
        const { color, word } = getLevel(level)
        const isSelected = selected === name
        const shape = SHAPES[name]
        return (
          <g
            key={name}
            role="button"
            tabIndex={0}
            aria-label={`${PART_META[name].label}: ${word}. Show details`}
            aria-pressed={isSelected}
            className="body-part"
            onClick={() => onSelect(name)}
            onKeyDown={(e) => handleKey(e, name)}
          >
            {/* Keyboard focus halo (shown via CSS on :focus-visible) */}
            {cloneElement(shape, { className: 'part-focus', fill: 'none', stroke: '#34ddef', strokeWidth: 12 })}
            {/* Slow pulsing outer glow on RED parts */}
            {level === 'RED' &&
              cloneElement(shape, {
                fill: 'none',
                stroke: color,
                strokeWidth: 10,
                strokeOpacity: 0.45,
                className: 'motion-safe:animate-pulse-slow',
                pointerEvents: 'none',
              })}
            {cloneElement(shape, {
              fill: isSelected ? `${color}40` : '#222a4d',
              stroke: color,
              strokeWidth: isSelected ? 5 : 3,
              className: 'transition-[fill,stroke-width] duration-200',
            })}
            <g pointerEvents="none">{SYMBOLS[name]}</g>
          </g>
        )
      })}
    </svg>
  )
}
