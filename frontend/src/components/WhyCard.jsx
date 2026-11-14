import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function WhyCard({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-sm w-full max-w-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-dim hover:text-muted transition-colors duration-150 py-1"
      >
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        <span>Why this test?</span>
      </button>
      {open && (
        <div
          className="mt-2 text-muted leading-relaxed pl-4 py-1"
          style={{ borderLeft: '1px solid var(--line)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
