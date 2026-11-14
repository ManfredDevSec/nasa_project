import { useState } from 'react'
import WhyCard from './WhyCard'
import Button from './Button'

const SLOAN = 'CDHKNORSVZ'

function randomLetters() {
  return Array.from({ length: 5 }, () => SLOAN[Math.floor(Math.random() * SLOAN.length)])
}

function round1(n) {
  return Math.round(n * 10) / 10
}

export default function NearVisionStep({ pxPerMm, calibrated, onComplete }) {
  const [logMAR, setLogMAR] = useState(0.7)
  const [phase, setPhase] = useState('start')
  const [lastPassed, setLastPassed] = useState(null)
  const [letters, setLetters] = useState(randomLetters)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)

  const heightMm = 0.582 * Math.pow(10, logMAR)
  const heightPx = Math.max(8, Math.round(heightMm * pxPerMm))
  const spacing = Math.max(32, heightPx * 1.4)
  const svgW = spacing * 5
  const svgH = Math.max(48, heightPx * 1.6)

  function handleCheck() {
    const typed = input.trim().toUpperCase().replace(/\s+/g, '')
    let correct = 0
    for (let i = 0; i < 5; i++) {
      if (typed[i] === letters[i]) correct++
    }
    const passed = correct >= 3
    setFeedback({ passed, correct })
    setTimeout(() => advance(passed), 1100)
  }

  function advance(passed) {
    if (passed) {
      const nextLastPassed = lastPassed === null ? logMAR : Math.min(lastPassed, logMAR)
      if (phase === 'going-up') {
        onComplete(round1(logMAR))
        return
      }
      const next = round1(logMAR - 0.1)
      if (next < 0) {
        onComplete(round1(logMAR))
        return
      }
      setLastPassed(nextLastPassed)
      setPhase('going-down')
      setLogMAR(next)
    } else {
      if (phase === 'going-down') {
        onComplete(round1(lastPassed))
        return
      }
      const next = round1(logMAR + 0.1)
      if (next > 1.0) {
        onComplete(1.1)
        return
      }
      setPhase('going-up')
      setLogMAR(next)
    }
    setLetters(randomLetters())
    setInput('')
    setFeedback(null)
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Near vision</h2>
        <p className="text-muted text-sm mt-1">
          Hold the screen at reading distance (~40 cm). Type the letters you see.
        </p>
      </div>

      {!calibrated && (
        <div
          className="px-3 py-2 text-sm text-center max-w-sm"
          style={{ border: '1px solid var(--watch)', color: 'var(--watch)' }}
        >
          Not calibrated — letter sizes are approximate
        </div>
      )}

      <div className="bg-white p-3 overflow-x-auto max-w-full">
        <svg
          width={svgW}
          height={svgH}
          style={{ display: 'block', userSelect: 'none' }}
          aria-label="Vision chart letters"
        >
          {letters.map((letter, i) => (
            <text
              key={i}
              x={spacing / 2 + i * spacing}
              y={svgH * 0.87}
              fontSize={heightPx}
              textAnchor="middle"
              dominantBaseline="auto"
              fontFamily="'Courier New', Courier, monospace"
              fontWeight="bold"
              fill="black"
            >
              {letter}
            </text>
          ))}
        </svg>
      </div>

      {feedback ? (
        <div
          className="text-base font-mono font-medium py-2"
          style={{ color: feedback.passed ? 'var(--ok)' : 'var(--alert)' }}
        >
          {feedback.correct}/5 correct — {feedback.passed ? 'Pass' : 'Fail'}
        </div>
      ) : (
        <>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && input.trim().length > 0 && handleCheck()}
            className="w-full max-w-sm text-center text-2xl uppercase tracking-[0.3em] px-4 py-3 font-mono bg-surface text-ink transition-colors duration-150"
            style={{ border: '1px solid var(--line)', outline: 'none' }}
            onFocus={e => (e.target.style.borderColor = 'var(--muted)')}
            onBlur={e => (e.target.style.borderColor = 'var(--line)')}
            placeholder="e.g. DCHKN"
            maxLength={5}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            onClick={handleCheck}
            disabled={input.trim().length === 0}
            className="w-full max-w-sm"
          >
            Check
          </Button>
        </>
      )}

      <WhyCard>
        Space can slowly blur near vision. Reading smaller and smaller letters shows if yours has changed.
      </WhyCard>
    </div>
  )
}
