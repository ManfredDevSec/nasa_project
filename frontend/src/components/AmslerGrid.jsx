import { useRef, useState } from 'react'
import WhyThisTest from './WhyThisTest.jsx'

const SIZE = 10 // 10 x 10 squares

/**
 * Step B: Amsler grid. The user stares at the centre dot and taps squares that look wrong.
 * Result: list of [row, col] (0-indexed), or [] when all lines look straight.
 */
export default function AmslerGrid({ onComplete }) {
  const [marked, setMarked] = useState(() => new Set()) // cell numbers 0-99
  const [focusIndex, setFocusIndex] = useState(0)
  const cellRefs = useRef([])

  function toggle(index) {
    setMarked((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  // Arrow keys move between squares, so keyboard users do not need 100 Tab presses.
  function handleKeyDown(e, index) {
    const row = Math.floor(index / SIZE)
    const col = index % SIZE
    const moves = {
      ArrowUp: [Math.max(row - 1, 0), col],
      ArrowDown: [Math.min(row + 1, SIZE - 1), col],
      ArrowLeft: [row, Math.max(col - 1, 0)],
      ArrowRight: [row, Math.min(col + 1, SIZE - 1)],
    }
    if (!moves[e.key]) return
    e.preventDefault()
    const [r, c] = moves[e.key]
    const next = r * SIZE + c
    setFocusIndex(next)
    cellRefs.current[next]?.focus()
  }

  function finish() {
    const cells = [...marked].sort((a, b) => a - b).map((i) => [Math.floor(i / SIZE), i % SIZE])
    onComplete(cells)
  }

  return (
    <section aria-labelledby="amsler-title" className="grid items-start gap-6 md:grid-cols-[auto_1fr]">
      <div className="relative mx-auto aspect-square w-[min(30rem,100%)] border-2 border-white bg-black">
        <div role="grid" aria-label="Amsler grid, 10 by 10 squares" className="grid size-full grid-cols-10 grid-rows-10">
          {Array.from({ length: SIZE }, (_, row) => (
            <div role="row" key={row} className="contents">
              {Array.from({ length: SIZE }, (_, col) => {
                const index = row * SIZE + col
                const isMarked = marked.has(index)
                return (
                  <button
                    key={col}
                    ref={(el) => (cellRefs.current[index] = el)}
                    type="button"
                    role="gridcell"
                    tabIndex={index === focusIndex ? 0 : -1}
                    aria-pressed={isMarked}
                    aria-label={`Row ${row + 1}, column ${col + 1}${isMarked ? ', marked as wavy or missing' : ''}`}
                    onClick={() => {
                      setFocusIndex(index)
                      toggle(index)
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`relative border border-white/70 transition-colors focus-visible:z-10 ${
                      isMarked ? 'bg-amber-500/55' : 'hover:bg-white/10'
                    }`}
                  >
                    {/* A cross as well as colour, so marked squares are visible without colour vision */}
                    {isMarked && (
                      <svg viewBox="0 0 10 10" className="absolute inset-[30%]" aria-hidden="true">
                        <path d="M1 1l8 8M9 1 1 9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {/* Fixation dot where the four centre squares meet */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-black"
        />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="amsler-title" className="text-2xl font-semibold">
            Amsler grid
          </h2>
          <WhyThisTest>
            This records any squares where the lines do not look straight to you. Sightline compares your marks with
            your previous test.
          </WhyThisTest>
        </div>
        <ol className="list-decimal space-y-2 pl-6 text-slate-300">
          <li>Look only at the white dot in the middle. Keep looking at it.</li>
          <li>Without moving your eye, notice if any lines look wavy, bent, blurry or missing.</li>
          <li>Tap those squares to mark them. Tap again to unmark.</li>
        </ol>
        <p className="text-slate-400" aria-live="polite">
          {marked.size === 0 ? 'No squares marked.' : `${marked.size} square${marked.size === 1 ? '' : 's'} marked.`}
        </p>
        <div className="flex flex-col gap-3">
          {marked.size === 0 ? (
            <button type="button" onClick={() => onComplete([])} className="btn-primary">
              All lines look straight
            </button>
          ) : (
            <>
              <button type="button" onClick={finish} className="btn-primary">
                Continue with {marked.size} marked
              </button>
              <button type="button" onClick={() => setMarked(new Set())} className="btn-secondary">
                Clear all marks
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
