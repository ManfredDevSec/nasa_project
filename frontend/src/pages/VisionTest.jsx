import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEngagement, getErrorMessage, isNoBaseline, submitCheck } from '../api/index.js'
import AmslerGrid from '../components/AmslerGrid.jsx'
import ContrastStep from '../components/ContrastStep.jsx'
import { CheckIcon, CloseIcon, EyeIcon } from '../components/Icons.jsx'
import NearVisionStep from '../components/NearVisionStep.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import SymptomSliders from '../components/SymptomSliders.jsx'
import { getUser } from '../utils/auth.js'
import { saveLastResult } from '../utils/lastResult.js'
import { buildCheckPayload } from '../utils/payloads.js'

// The whole test, in order. "cover" screens tell the user which eye to cover.
// Left eye first, then right eye, then symptoms once at the end.
const SEQUENCE = [
  { kind: 'intro' },
  { kind: 'cover', eye: 'left' },
  { kind: 'near', eye: 'left' },
  { kind: 'amsler', eye: 'left' },
  { kind: 'contrast', eye: 'left' },
  { kind: 'cover', eye: 'right' },
  { kind: 'near', eye: 'right' },
  { kind: 'amsler', eye: 'right' },
  { kind: 'contrast', eye: 'right' },
  { kind: 'symptoms' },
]
const SCORED_KINDS = ['near', 'amsler', 'contrast', 'symptoms']
const TOTAL_STEPS = SEQUENCE.filter((s) => SCORED_KINDS.includes(s.kind)).length
const STEP_NAMES = { near: 'Near vision', amsler: 'Amsler grid', contrast: 'Contrast', symptoms: 'Symptoms' }

// Every answer lives in this one object. The keys are the POST /checks/ field names.
// Scores: a HIGHER near-vision line and contrast level mean BETTER vision.
const EMPTY_ANSWERS = {
  near_vision_left: null,
  amsler_left: null,
  contrast_left: null,
  near_vision_right: null,
  amsler_right: null,
  contrast_right: null,
  headache: 0,
  eye_pressure: 0,
  blur: 0,
}

// Answer field for a step + eye, e.g. ('near', 'left') -> 'near_vision_left'.
const FIELD_PREFIX = { near: 'near_vision', amsler: 'amsler', contrast: 'contrast' }

export default function VisionTest() {
  const navigate = useNavigate()
  const user = getUser()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState(EMPTY_ANSWERS)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const topRef = useRef(null)

  const step = SEQUENCE[stepIndex]
  // Which scored step we are on (1-based), for the progress bar.
  const scoredNumber = SEQUENCE.slice(0, stepIndex + 1).filter((s) => SCORED_KINDS.includes(s.kind)).length

  // Move keyboard / screen-reader focus to the top of each new step.
  useEffect(() => {
    topRef.current?.focus()
  }, [stepIndex])

  const next = () => setStepIndex((i) => Math.min(i + 1, SEQUENCE.length - 1))

  function saveStepResult(value) {
    setAnswers((a) => ({ ...a, [`${FIELD_PREFIX[step.kind]}_${step.eye}`]: value }))
    next()
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Remember how many tests were done BEFORE this one, so /result can celebrate the new one.
      const before = await getEngagement(user.astronaut_id).catch(() => null)
      const result = await submitCheck(buildCheckPayload(answers, user.astronaut_id))
      const state = { result, testsBefore: before?.tests_completed ?? null }
      saveLastResult(state) // so the result page still works after a refresh
      navigate('/result', { state })
    } catch (error) {
      setSubmitError(error)
      setSubmitting(false)
    }
  }

  function exitTest() {
    if (stepIndex === 0 || window.confirm('Leave the eye test? Your answers so far will not be saved.')) {
      navigate('/home')
    }
  }

  if (step.kind === 'cover') {
    return <CoverEyeScreen testEye={step.eye} onReady={next} onExit={exitTest} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {step.kind === 'intro' ? (
            <h1 className="display-title text-3xl md:text-4xl">Weekly eye test</h1>
          ) : (
            <ProgressBar
              current={scoredNumber}
              total={TOTAL_STEPS}
              eyeLabel={step.eye ? `${step.eye === 'left' ? 'Left' : 'Right'} eye` : 'Both eyes'}
              stepLabel={STEP_NAMES[step.kind]}
            />
          )}
        </div>
        <button type="button" onClick={exitTest} className="btn-secondary px-4" aria-label="Exit eye test">
          <CloseIcon className="size-5" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      {/* key={stepIndex} replays the slide-in animation and resets each step */}
      <div key={stepIndex} ref={topRef} tabIndex={-1} className="animate-step-in outline-none">
        {step.kind === 'intro' && <IntroScreen onStart={next} />}
        {step.kind === 'near' && <NearVisionStep onComplete={saveStepResult} />}
        {step.kind === 'amsler' && <AmslerGrid onComplete={saveStepResult} />}
        {step.kind === 'contrast' && <ContrastStep onComplete={saveStepResult} />}
        {step.kind === 'symptoms' && (
          <>
            <SymptomSliders
              values={answers}
              onChange={(field, value) => setAnswers((a) => ({ ...a, [field]: value }))}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
            {submitError && (
              <p role="alert" className="mx-auto mt-4 max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-200">
                {isNoBaseline(submitError)
                  ? 'No baseline yet. Ask the Medical Officer to record your baseline tests.'
                  : `Your results were not sent: ${getErrorMessage(submitError)} Your answers are kept, so press Submit again.`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function IntroScreen({ onStart }) {
  const tips = [
    'Sit somewhere with good, even light.',
    'Turn your screen brightness up to full.',
    'Hold the tablet at the same distance as every week.',
    'Wear your usual reading glasses or lenses if you normally use them.',
  ]
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <h2 className="mb-4 text-xl font-semibold">Before you start</h2>
        <ul className="space-y-3">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-3">
              <CheckIcon className="mt-1 size-5 shrink-0 text-sky-400" />
              <span className="text-slate-300">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card flex flex-col p-6">
        <h2 className="mb-4 text-xl font-semibold">What happens</h2>
        <ol className="list-decimal space-y-2 pl-6 text-slate-300">
          <li>Three short tests with your left eye.</li>
          <li>The same three tests with your right eye.</li>
          <li>Three quick questions about how you feel.</li>
        </ol>
        <p className="mt-4 text-slate-400">It only takes a few minutes. There are no wrong answers, just do your best.</p>
        <button type="button" onClick={onStart} className="btn-primary mt-auto self-start px-8">
          Start the test
        </button>
      </div>
    </div>
  )
}

// Full-screen instruction shown before each eye's tests.
function CoverEyeScreen({ testEye, onReady, onExit }) {
  const coverEye = testEye === 'left' ? 'RIGHT' : 'LEFT'
  const buttonRef = useRef(null)
  useEffect(() => buttonRef.current?.focus(), [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-title"
      className="fixed inset-0 z-50 flex animate-step-in flex-col items-center justify-center gap-8 bg-slate-950 p-6 text-center"
    >
      <p className="font-mono text-sm tracking-widest text-slate-400">
        {testEye === 'left' ? 'PART 1 OF 2 · LEFT EYE' : 'PART 2 OF 2 · RIGHT EYE'}
      </p>
      <h1 id="cover-title" className="display-title text-6xl">
        Cover your {coverEye} eye
      </h1>
      {/* Drawn from your own point of view: your left eye on the left. */}
      <div className="flex gap-10" aria-hidden="true">
        <EyeDiagram label="Left eye" covered={coverEye === 'LEFT'} />
        <EyeDiagram label="Right eye" covered={coverEye === 'RIGHT'} />
      </div>
      <p className="max-w-lg text-lg text-slate-300">
        Cup your palm gently over your {coverEye.toLowerCase()} eye. Do not press on it. Keep it covered until this
        part is done.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={onExit} className="btn-secondary">
          Exit test
        </button>
        <button ref={buttonRef} type="button" onClick={onReady} className="btn-primary px-10">
          My {coverEye.toLowerCase()} eye is covered
        </button>
      </div>
    </div>
  )
}

function EyeDiagram({ label, covered }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex size-32 items-center justify-center rounded-full border-2 ${
          covered ? 'border-slate-700 bg-slate-800' : 'border-sky-400 bg-slate-900'
        }`}
      >
        {covered ? (
          <span className="h-14 w-20 rounded-[2rem] bg-slate-600" />
        ) : (
          <EyeIcon className="size-16 text-white" strokeWidth={1.5} />
        )}
      </div>
      <span className="text-lg font-medium">{label}</span>
      <span className={`font-mono text-sm tracking-widest ${covered ? 'text-slate-400' : 'text-sky-400'}`}>
        {covered ? 'COVERED' : 'TESTING'}
      </span>
    </div>
  )
}
