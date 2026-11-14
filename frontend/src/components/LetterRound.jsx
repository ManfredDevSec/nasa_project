import { useEffect, useState } from 'react'
import { LETTERS, LETTERS_PER_LINE, countCorrect } from '../utils/letters.js'
import { BackspaceIcon } from './Icons.jsx'

/**
 * One round of the letter game: shows 5 letters and lets the user type what they see,
 * with the on-screen keypad or a real keyboard. Calls onSubmit(numberCorrect).
 * The parent gives it a new `key` for every round so the typed letters reset.
 */
export default function LetterRound({ letters, fontSize, opacity = 1, onSubmit }) {
  const [typed, setTyped] = useState([])
  const full = typed.length === LETTERS_PER_LINE

  const add = (letter) => setTyped((t) => (t.length < LETTERS_PER_LINE ? [...t, letter] : t))
  const remove = () => setTyped((t) => t.slice(0, -1))
  const submit = () => onSubmit(countCorrect(letters, typed))

  // Physical keyboard support (laptop testing).
  useEffect(() => {
    function onKey(e) {
      // Let Enter/Space on a focused button do its normal job instead.
      if (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return
      const key = e.key.toUpperCase()
      if (LETTERS.includes(key)) add(key)
      else if (e.key === 'Backspace') remove()
      else if (e.key === 'Enter' && full) submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_22rem]">
      {/* The letters to read. Hidden from screen readers so the answer is not read aloud. */}
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-800 bg-black px-4">
        <p
          aria-hidden="true"
          className="font-sans leading-none font-bold text-white select-none"
          style={{ fontSize: `${fontSize}px`, opacity, letterSpacing: '0.45em', marginRight: '-0.45em' }}
        >
          {letters.join('')}
        </p>
        <span className="sr-only">Read the five letters shown on screen, then type them.</span>
      </div>

      <div className="flex flex-col gap-4">
        {/* What the user has typed so far */}
        <div className="flex justify-between gap-2" aria-live="polite" aria-label={`You typed ${typed.join(' ') || 'nothing yet'}`}>
          {Array.from({ length: LETTERS_PER_LINE }, (_, i) => (
            <span
              key={i}
              className={`flex h-14 flex-1 items-center justify-center rounded-xl border-2 font-mono text-2xl font-semibold ${
                typed[i] ? 'border-slate-500 bg-slate-800' : i === typed.length ? 'border-sky-400' : 'border-slate-800'
              }`}
            >
              {typed[i] ?? ''}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Letter keypad">
          {LETTERS.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => add(letter)}
              disabled={full}
              className="min-h-14 rounded-xl border border-slate-700 bg-slate-900 font-mono text-xl font-semibold transition-colors hover:bg-slate-800 active:bg-slate-700 disabled:opacity-40"
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={remove} disabled={!typed.length} className="btn-secondary px-4" aria-label="Delete last letter">
            <BackspaceIcon />
          </button>
          <button type="button" onClick={submit} disabled={!full} className="btn-primary">
            Check
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSubmit(countCorrect(letters, typed))}
          className="min-h-12 rounded-xl text-slate-400 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          I can't read these letters
        </button>
      </div>
    </div>
  )
}
