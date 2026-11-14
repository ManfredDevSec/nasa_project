import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import NearVisionStep from '../components/NearVisionStep'
import AmslerGrid from '../components/AmslerGrid'
import ContrastStep from '../components/ContrastStep'
import SymptomSliders from '../components/SymptomSliders'
import { submitCheck } from '../api/client'

const STEP_LABELS = ['Calibrate', 'Near Vision', 'Left Eye', 'Right Eye', 'Contrast', 'Symptoms']
const TOTAL = STEP_LABELS.length

function CalibrationStep({ pxPerMm, setPxPerMm, onSave, onSkip }) {
  const cardPx = Math.round(85.6 * pxPerMm)
  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Screen Calibration</h2>
        <p className="text-slate-400 text-sm mt-1">
          Drag the slider until the grey bar below matches the width of a bank card (85.6 mm).
        </p>
      </div>

      <div className="overflow-x-auto w-full flex justify-center py-2">
        <div
          className="bg-slate-300 rounded-md border-2 border-slate-400"
          style={{ width: cardPx, height: 54, minWidth: cardPx, flexShrink: 0 }}
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
          className="w-full accent-indigo-500"
        />
        <span className="text-center text-xs text-slate-500">{pxPerMm.toFixed(2)} px/mm</span>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onSave}
          className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold active:scale-95 transition-all"
        >
          Save &amp; Continue
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 rounded-xl bg-slate-800 text-slate-400 text-sm active:scale-95 transition-all"
        >
          Skip (use default 3.78 px/mm)
        </button>
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

  const progress = step === 0 ? 0 : (step / (TOTAL - 1)) * 100

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      {/* Nav row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-1">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all shrink-0"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-white">{STEP_LABELS[step]}</span>
            <span className="text-xs text-slate-500">Step {step + 1} / {TOTAL}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
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
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
          >
            Restart test
          </button>
        </div>
      )}
    </div>
  )
}
