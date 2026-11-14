import { useState } from 'react'
import WhyCard from './WhyCard'

const ROWS = 20
const COLS = 20
const CELL = 14
const GAP = 1
const PAD = 1

const GRID_W = PAD + COLS * CELL + (COLS - 1) * GAP + PAD
const GRID_H = PAD + ROWS * CELL + (ROWS - 1) * GAP + PAD

function cellKey(r, c) {
  return `${r},${c}`
}

export default function AmslerGrid({ eye, onComplete }) {
  const [marked, setMarked] = useState(() => new Set())

  function toggle(r, c) {
    const k = cellKey(r, c)
    setMarked(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  function finish(cells) {
    onComplete(cells)
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {eye === 'left' ? 'Left Eye' : 'Right Eye'} — Amsler Grid
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Cover your {eye === 'left' ? 'right' : 'left'} eye. Stare only at the centre dot.
          Tap squares where lines look wavy, bent, or missing.
        </p>
      </div>

      <div
        style={{
          position: 'relative',
          width: GRID_W,
          height: GRID_H,
          backgroundColor: 'white',
          padding: PAD,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
          gap: GAP,
          flexShrink: 0,
        }}
      >
        {Array.from({ length: ROWS * COLS }, (_, idx) => {
          const r = Math.floor(idx / COLS)
          const c = idx % COLS
          const isMarked = marked.has(cellKey(r, c))
          return (
            <div
              key={idx}
              onClick={() => toggle(r, c)}
              style={{
                width: CELL,
                height: CELL,
                backgroundColor: isMarked ? 'rgba(251,191,36,0.75)' : 'black',
                cursor: 'pointer',
              }}
            />
          )
        })}
        {/* centre dot */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: 'white',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={() => finish([])}
          className="w-full py-4 rounded-xl bg-slate-700 text-white font-bold active:scale-95 transition-all"
        >
          All lines look straight
        </button>
        <button
          onClick={() => finish([...marked].map(k => k.split(',').map(Number)))}
          className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold active:scale-95 transition-all"
        >
          Next
        </button>
      </div>

      <WhyCard>
        Pressure at the back of the eye can make straight lines look wavy. This catches it early.
      </WhyCard>
    </div>
  )
}
