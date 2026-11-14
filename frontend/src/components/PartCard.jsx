import { useNavigate } from 'react-router-dom'
import { PART_META } from '../utils/parts.js'
import { ArrowRightIcon, CloseIcon } from './Icons.jsx'
import SourcedText, { NasaLink } from './SourcedText.jsx'
import StatusBadge from './StatusBadge.jsx'

// Side card with plain-language details about one body part.
export default function PartCard({ part, onClose }) {
  const navigate = useNavigate()
  const meta = PART_META[part.part] ?? { label: part.part, Icon: () => null }
  const { Icon } = meta
  const sections = [
    { title: 'What it does', text: part.info?.function },
    { title: 'What space does to it', text: part.info?.space_effect },
    { title: 'What you can do', text: part.info?.what_to_do },
  ].filter((s) => s.text)

  return (
    <article aria-labelledby="part-title" className="card flex animate-step-in flex-col gap-5 p-6">
      <div className="flex items-center gap-3">
        <Icon className="size-7 text-slate-300" />
        <h2 id="part-title" className="text-2xl font-semibold">
          {meta.label}
        </h2>
        <StatusBadge level={part.level} className="ml-2" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="ml-auto flex size-12 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>

      {part.summary && <p className="text-lg text-slate-100">{part.summary}</p>}

      <dl className="grid gap-4">
        {sections.map(({ title, text }) => (
          <div key={title} className="border-l-2 border-slate-700 pl-4">
            <dt className="text-sm font-semibold tracking-wide text-slate-400 uppercase">{title}</dt>
            <SourcedText as="dd" text={text} className="text-slate-200" />
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {part.action?.route && (
          <button type="button" onClick={() => navigate(part.action.route)} className="btn-primary">
            {part.action.label ?? 'Go'}
            <ArrowRightIcon className="size-5" />
          </button>
        )}
        <NasaLink url={meta.readMore} />
      </div>
    </article>
  )
}
