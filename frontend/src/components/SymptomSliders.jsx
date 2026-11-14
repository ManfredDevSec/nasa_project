import { useState } from 'react'

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
      <h2 className="text-xl font-bold text-center">Symptoms</h2>

      {SYMPTOMS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium text-sm">{label}</span>
          <div className="grid grid-cols-4 gap-1.5">
            {SEVERITY.map((lvl, i) => (
              <button
                key={i}
                onClick={() => set(key, i)}
                className={`py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  values[key] === i
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => onSubmit(values)}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg disabled:opacity-60 active:scale-95 transition-all mt-2"
      >
        {loading ? 'Submitting…' : 'Submit test'}
      </button>
    </div>
  )
}
