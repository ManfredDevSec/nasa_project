import { useState } from 'react'

export default function WhyCard({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden text-sm w-full max-w-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-slate-300 bg-slate-800/60 active:bg-slate-700/60"
      >
        <span>Why this test?</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="currentColor"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-3 text-slate-400 bg-slate-900/60 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}
