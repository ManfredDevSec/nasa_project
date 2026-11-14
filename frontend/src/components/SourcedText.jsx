import { needsSource } from '../content/learn.js'

// Shows text normally, or with a dashed "Needs source" style while it still says "TODO: source needed".
export default function SourcedText({ text, as: Tag = 'p', className = '' }) {
  if (!needsSource(text)) return <Tag className={className}>{text}</Tag>
  return (
    <Tag className={`${className} rounded-lg border border-dashed border-slate-600 px-2 py-1 text-slate-400 italic`}>
      {text}
    </Tag>
  )
}

// "Read more at NASA" link, or a TODO marker until the URL is filled in.
export function NasaLink({ url, label = 'Read more at NASA' }) {
  if (!url) {
    return (
      <span className="text-sm text-slate-500">
        {label}: <span className="italic">TODO: source needed</span>
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 items-center text-sky-400 underline-offset-4 hover:text-sky-300 hover:underline"
    >
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
