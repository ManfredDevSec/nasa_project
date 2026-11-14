import { useId, useState } from 'react'
import { InfoIcon } from './Icons.jsx'

// Small toggle that reveals one or two plain sentences about a test step.
export default function WhyThisTest({ children }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 items-center gap-2 rounded-lg px-3 text-sky-400 transition-colors hover:bg-slate-900 hover:text-sky-300"
      >
        <InfoIcon className="size-5" />
        {open ? 'Hide' : 'Why this test?'}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="mt-1 max-w-md animate-step-in rounded-xl border border-slate-800 bg-slate-900 p-4 text-base text-slate-300"
      >
        {children}
      </div>
    </div>
  )
}
