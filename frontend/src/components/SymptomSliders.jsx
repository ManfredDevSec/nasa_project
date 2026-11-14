import { useState } from 'react'
import Button from './Button'

const SYMPTOMS = [
  { key: 'headache', label: 'Headache' },
  { key: 'eye_pressure', label: 'Eye pressure' },
  { key: 'blur', label: 'Blurry vision' },
]

const SEVERITY = ['None', 'Mild', 'Moderate', 'Severe']

export default function SymptomSliders({ onSubmit, loading }) {
  const [values, setValues] = useState({ headache: 0, eye_pressure: 0, blur: 0 })

  function set(key, val) {
    setValues(v => ({ ...v, [key]: val }))
  }

  return (
    <div className="flex flex-col gap-7 px-4 w-full">
      <h2 className="text-base font-semibold text-ink">Symptoms</h2>

      {SYMPTOMS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-2">
          <span className="text-muted text-sm">{label}</span>
          <div className="grid grid-cols-4 gap-1.5">
            {SEVERITY.map((lvl, i) => (
              <button
                key={i}
                onClick={() => set(key, i)}
                className="py-3 text-sm transition-colors duration-150"
                style={{
                  border: '1px solid',
                  borderColor: values[key] === i ? 'var(--ink)' : 'var(--line)',
                  color: values[key] === i ? 'var(--bg)' : 'var(--muted)',
                  backgroundColor: values[key] === i ? 'var(--ink)' : 'transparent',
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={() => onSubmit(values)} disabled={loading} className="w-full text-base">
        {loading ? 'Submitting…' : 'Submit test'}
      </Button>
    </div>
  )
}
