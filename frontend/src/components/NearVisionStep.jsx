import { useMemo, useState } from 'react'
import { PASS_MARK, randomLetters } from '../utils/letters.js'
import LetterRound from './LetterRound.jsx'
import WhyThisTest from './WhyThisTest.jsx'

// Line 1 is the biggest text, line 10 the smallest.
const LINE_SIZES_PX = [64, 54, 46, 38, 32, 26, 22, 18, 14, 11]

/**
 * Step A: read lines of letters that get smaller.
 * Passing a line (4+ of 5 correct) moves to the next smaller line; the first fail stops the step.
 * Result: the last line passed (1-10). If no line was passed we still send 1.
 */
export default function NearVisionStep({ onComplete }) {
  const [lineIndex, setLineIndex] = useState(0)
  // New random letters every line.
  const letters = useMemo(() => randomLetters(), [lineIndex])

  function handleRound(correct) {
    const linesPassed = correct >= PASS_MARK ? lineIndex + 1 : lineIndex
    const finished = correct < PASS_MARK || linesPassed === LINE_SIZES_PX.length
    if (finished) onComplete(Math.max(linesPassed, 1))
    else setLineIndex(lineIndex + 1)
  }

  return (
    <section aria-labelledby="near-title" className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="near-title" className="text-2xl font-semibold">
            Near vision
          </h2>
          <p className="text-slate-400">
            Type the letters you see. Line <span className="font-mono text-white">{lineIndex + 1}</span> of 10. Guess if
            you are not sure.
          </p>
        </div>
        <WhyThisTest>
          This records the smallest line of letters you can read with this eye. Sightline compares it with your own
          normal from your baseline tests.
        </WhyThisTest>
      </div>
      <LetterRound key={lineIndex} letters={letters} fontSize={LINE_SIZES_PX[lineIndex]} onSubmit={handleRound} />
    </section>
  )
}
