import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Header from '../components/Header'
import NearVisionStep from '../components/NearVisionStep'
import AmslerGrid from '../components/AmslerGrid'
import ContrastStep from '../components/ContrastStep'
import SymptomSliders from '../components/SymptomSliders'
import Button from '../components/Button'
import { submitCheck } from '../api/client'

const STEP_LABELS = ['Calibrate', 'Near vision', 'Amsler grid, left eye', 'Amsler grid, right eye', 'Contrast sensitivity', 'Symptoms']
const TOTAL = STEP_LABELS.length

function CalibrationStep({ pxPerMm, setPxPerMm, onSave, onSkip }) {
  const cardPx = Math.round(85.6 * pxPerMm)
  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Screen calibration</h2>
        <p className="text-muted text-sm mt-1">
          Drag the slider until the grey bar below matches the width of a bank card (85.6 mm).
        </p>
      </div>

      <div className="overflow-x-auto w-full flex justify-center py-2">
        <div
          style={{
            width: cardPx,
            height: 54,
            minWidth: cardPx,
            flexShrink: 0,
            backgroundColor: '#9a978a',
            border: '1px solid #6b695f',
          }}
        />
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2">
        <input
          type="range"
          min="1.5"
          max="7.0"
          step="0.01"
          value={pxPerMm}
          onChange={e => setPxPerMm(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--muted)' }}
        />
        <span className="text-center font-mono text-xs text-dim">{pxPerMm.toFixed(2)} px/mm</span>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        <Button variant="primary" onClick={onSave} className="w-full">
          Use this size
        </Button>
        <Button variant="quiet" onClick={onSkip} className="w-full">
          Skip (use default 3.78 px/mm)
        </Button>
      </div>
    </div>
  )
}

export default function VisionTest() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(null)
  const [pxPerMm, setPxPerMm] = useState(3.78)
  const [sliderVal, setSliderVal] = useState(3.78)
  const [calibrated, setCalibrated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({
    near_vision: null,
    amsler_left: null,
    amsler_right: null,
    contrast: null,
  })

  useEffect(() => {
    let stored = null
    try {
      const raw = localStorage.getItem('pxPerMm')
      if (raw) stored = parseFloat(raw)
    } catch {}
    if (stored && stored > 0) {
      setPxPerMm(stored)
      setSliderVal(stored)
      setCalibrated(true)
      setStep(1)
    } else {
      setStep(0)
    }
  }, [])

  useEffect(() => {
    if (step === null || step === 0) return
    const handler = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [step])

  function saveCalibration() {
    try { localStorage.setItem('pxPerMm', sliderVal) } catch {}
    setPxPerMm(sliderVal)
    setCalibrated(true)
    setStep(1)
  }

  function handleBack() {
    if (step > 0) {
      if (!window.confirm('Leave the test? Progress will be lost.')) return
    }
    navigate(`/astronaut/${id}`)
  }

  function handleRestart() {
    if (!window.confirm('Restart the test? Progress will be lost.')) return
    setResults({ near_vision: null, amsler_left: null, amsler_right: null, contrast: null })
    setStep(calibrated ? 1 : 0)
  }

  async function handleSubmit(symptoms) {
    setLoading(true)
    try {
      const data = await submitCheck({
        astronaut: parseInt(id),
        near_vision: results.near_vision,
        contrast: results.contrast,
        amsler_left: results.amsler_left,
        amsler_right: results.amsler_right,
        headache: symptoms.headache,
        eye_pressure: symptoms.eye_pressure,
        blur: symptoms.blur,
      })
      navigate(`/astronaut/${id}/result`, { state: { result: data } })
    } catch (err) {
      alert('Submit failed: ' + err.message)
      setLoading(false)
    }
  }

  if (step === null) return null

  const totalTestSteps = TOTAL - 1

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header />

      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-line">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Back"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex gap-1 mb-2">
            {Array.from({ length: totalTestSteps }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: i <= step - 1 ? 'var(--text)' : 'var(--line)',
                  opacity: i === step - 1 ? 0.5 : 1,
                  transition: 'background-color 150ms, opacity 150ms',
                }}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-muted">
            Step {step === 0 ? 1 : step} of {TOTAL} · {STEP_LABELS[step]}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto py-8">
        {step === 0 && (
          <CalibrationStep
            pxPerMm={sliderVal}
            setPxPerMm={setSliderVal}
            onSave={saveCalibration}
            onSkip={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <NearVisionStep
            pxPerMm={pxPerMm}
            calibrated={calibrated}
            onComplete={v => { setResults(r => ({ ...r, near_vision: v })); setStep(2) }}
          />
        )}
        {step === 2 && (
          <AmslerGrid
            eye="left"
            onComplete={v => { setResults(r => ({ ...r, amsler_left: v })); setStep(3) }}
          />
        )}
        {step === 3 && (
          <AmslerGrid
            eye="right"
            onComplete={v => { setResults(r => ({ ...r, amsler_right: v })); setStep(4) }}
          />
        )}
        {step === 4 && (
          <ContrastStep
            onComplete={v => { setResults(r => ({ ...r, contrast: v })); setStep(5) }}
          />
        )}
        {step === 5 && (
          <SymptomSliders onSubmit={handleSubmit} loading={loading} />
        )}
      </div>

      {step > 0 && (
        <div className="text-center pb-10">
          <button
            onClick={handleRestart}
            className="font-mono text-xs text-dim hover:text-muted transition-colors duration-150"
          >
            Restart test
          </button>
        </div>
      )}
    </div>
  )
}
