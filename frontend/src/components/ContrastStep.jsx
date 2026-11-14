import { useState } from 'react'
import WhyCard from './WhyCard'

const SLOAN = 'CDHKNORSVZ'
const LEVELS = Array.from({ length: 14 }, (_, i) => Math.round(i * 15) / 100)

const toLinear = c =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

const toSRGB8 = l => {
  const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, s)) * 255)
}

const BG_LINEAR = toLinear(128 / 255)

function letterColor(logCS) {
  const C = Math.pow(10, -logCS)
  const v = toSRGB8(BG_LINEAR * (1 - C))
  return `rgb(${v},${v},${v})`
}

function randomLetters() {
  return Array.from({ length: 3 }, () => SLOAN[Math.floor(Math.random() * SLOAN.length)])
}

export default function ContrastStep({ onComplete }) {
  const [levelIdx, setLevelIdx] = useState(0)
  const [letters, setLetters] = useState(randomLetters)
  const [input, setInput] = useState('')
  const [lastPassed, setLastPassed] = useState(null)

  const logCS = LEVELS[levelIdx]
  const color = letterColor(logCS)

  function handleCheck() {
    const typed = input.trim().toUpperCase().replace(/\s+/g, '')
    let matches = 0
    for (let i = 0; i < 3; i++) {
      if (typed[i] === letters[i]) matches++
    }
    if (matches >= 2) {
      const nextIdx = levelIdx + 1
      if (nextIdx >= LEVELS.length) {
        onComplete(LEVELS[LEVELS.length - 1])
        return
      }
      setLastPassed(logCS)
      setLevelIdx(nextIdx)
      setLetters(randomLetters())
      setInput('')
    } else {
      onComplete(lastPassed ?? 0)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Contrast Sensitivity</h2>
        <p className="text-slate-400 text-sm mt-1">Type the letters you see.</p>
      </div>

      <div
        className="rounded-2xl flex items-center justify-center gap-5"
        style={{ backgroundColor: '#808080', width: 280, height: 110 }}
      >
        {letters.map((l, i) => (
          <span
            key={i}
            style={{
              color,
              fontSize: 40,
              fontFamily: "'Courier New', Courier, monospace",
              fontWeight: 'bold',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {l}
          </span>
        ))}
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && input.trim().length > 0 && handleCheck()}
        className="w-full max-w-sm text-center text-2xl uppercase tracking-[0.3em] bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors"
        placeholder="e.g. CDH"
        maxLength={3}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={handleCheck}
        disabled={input.trim().length === 0}
        className="w-full max-w-sm py-4 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-40 active:scale-95 transition-all"
      >
        Check
      </button>

      <WhyCard>
        Faded, low-contrast detail is often the first thing to go.
      </WhyCard>
    </div>
  )
}
