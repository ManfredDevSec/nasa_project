import { useMemo, useState } from 'react'
import { PASS_MARK, randomLetters } from '../utils/letters.js'
import LetterRound from './LetterRound.jsx'
import WhyThisTest from './WhyThisTest.jsx'

const FONT_SIZE_PX = 40
// Level 1 is full brightness, level 8 is very faint.
const LEVEL_OPACITY = [1.0, 0.7, 0.5, 0.35, 0.25, 0.17, 0.11, 0.07]

/**
 * Step C: same letter game at a fixed size, but the letters fade each level.
 * Result: the last level passed (1-8). If no level was passed we still send 1.
 */
export default function ContrastStep({ onComplete }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const letters = useMemo(() => randomLetters(), [levelIndex])

  function handleRound(correct) {
    const levelsPassed = correct >= PASS_MARK ? levelIndex + 1 : levelIndex
    const finished = correct < PASS_MARK || levelsPassed === LEVEL_OPACITY.length
    if (finished) onComplete(Math.max(levelsPassed, 1))
    else setLevelIndex(levelIndex + 1)
  }

  return (
    <section aria-labelledby="contrast-title" className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="contrast-title" className="text-2xl font-semibold">
            Contrast
          </h2>
          <p className="text-slate-400">
            The letters get fainter each time. Level <span className="font-mono text-white">{levelIndex + 1}</span> of
            8. Guess if you are not sure.
          </p>
        </div>
        <WhyThisTest>
          This records how faint the letters can get before you can no longer read them. Sightline compares it with
          your own normal from your baseline tests.
        </WhyThisTest>
      </div>
      <LetterRound
        key={levelIndex}
        letters={letters}
        fontSize={FONT_SIZE_PX}
        opacity={LEVEL_OPACITY[levelIndex]}
        onSubmit={handleRound}
      />
    </section>
  )
}
