import WhyThisTest from './WhyThisTest.jsx'

export const SYMPTOMS = [
  { field: 'headache', label: 'Headache' },
  { field: 'eye_pressure', label: 'Eye pressure' },
  { field: 'blur', label: 'Blurry vision' },
]
const WORDS = ['None', 'Mild', 'Moderate', 'Severe'] // slider values 0-3

/** Step D: three 0-3 sliders, asked once after both eyes. */
export default function SymptomSliders({ values, onChange, onSubmit, submitting }) {
  return (
    <section aria-labelledby="symptoms-title" className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="symptoms-title" className="text-2xl font-semibold">
            How do you feel today?
          </h2>
          <p className="text-slate-400">You can uncover both eyes now. Move each slider to match how you feel.</p>
        </div>
        <WhyThisTest>
          Your answers are saved with this test, so the Crew Medical Officer can see how you felt when you took it.
        </WhyThisTest>
      </div>

      {SYMPTOMS.map(({ field, label }) => {
        const value = values[field]
        return (
          <div key={field} className="card p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor={`symptom-${field}`} className="text-lg font-medium">
                {label}
              </label>
              <span className="font-mono text-lg text-white">{WORDS[value]}</span>
            </div>
            <input
              id={`symptom-${field}`}
              type="range"
              min={0}
              max={3}
              step={1}
              value={value}
              aria-valuetext={WORDS[value]}
              onChange={(e) => onChange(field, Number(e.target.value))}
              className="h-12 w-full cursor-pointer accent-sky-400"
            />
            {/* Tappable words under the slider. The slider itself is the accessible control. */}
            <div className="grid grid-cols-4 text-sm" aria-hidden="true">
              {WORDS.map((word, i) => (
                <button
                  key={word}
                  type="button"
                  tabIndex={-1}
                  onClick={() => onChange(field, i)}
                  className={`min-h-10 rounded-md ${i === 0 ? 'text-left' : i === 3 ? 'text-right' : 'text-center'} ${
                    i === value ? 'font-semibold text-white' : 'text-slate-400'
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <button type="button" onClick={onSubmit} disabled={submitting} className="btn-primary self-end px-8">
        {submitting ? 'Sending results…' : 'Submit results'}
      </button>
    </section>
  )
}
