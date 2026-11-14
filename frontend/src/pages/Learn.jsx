import { NASA_LINKS, SOURCES, learnSections } from '../content/learn.js'
import SourcedText, { NasaLink } from '../components/SourcedText.jsx'
import { EmptyState } from '../components/StateViews.jsx'

// Static learning page. All text and links come from src/content/learn.js.
export default function Learn() {
  if (!learnSections.length) return <EmptyState title="Nothing to read yet" message="Learning content will appear here." />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display-title text-4xl md:text-5xl">Learn</h1>
        <p className="text-slate-400">Short background reading, taken from NASA sources.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {learnSections.map((section) => (
          <section
            key={section.id}
            aria-labelledby={`learn-${section.id}`}
            className={`card flex flex-col gap-4 p-6 ${section.items ? 'md:col-span-2' : ''}`}
          >
            <h2 id={`learn-${section.id}`} className="text-2xl font-semibold">
              {section.title}
            </h2>
            {section.paragraphs.map((text, i) => (
              <SourcedText key={i} text={text} className="text-slate-300" />
            ))}

            {section.items && (
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <span className="flex items-center justify-between font-mono text-sm text-slate-500">
                      {String(i + 1).padStart(2, '0')}
                      {item.sightline && (
                        <span className="rounded border border-sky-400/60 px-1.5 py-0.5 text-xs text-sky-300">Sightline</span>
                      )}
                    </span>
                    <SourcedText text={item.name} className="font-semibold text-white" />
                    <SourcedText text={item.text} className="text-sm text-slate-300" />
                  </li>
                ))}
              </ol>
            )}
            {section.note && <p className="text-slate-300">{section.note}</p>}

            <div className="mt-auto border-t border-slate-800 pt-2">
              <NasaLink url={NASA_LINKS[section.link]} />
            </div>
          </section>
        ))}
      </div>

      <section aria-labelledby="sources-title" className="rounded-2xl border border-slate-800 p-6">
        <h2 id="sources-title" className="mb-3 text-xl font-semibold">
          Sources
        </h2>
        <ul className="space-y-3">
          {SOURCES.map((source) => (
            <li key={source.id}>
              <p className="font-medium">{source.label}</p>
              <ul className="mt-1 space-y-1 pl-4">
                {source.urls.map((key) => (
                  <li key={key} className="text-sm">
                    {NASA_LINKS[key] ? (
                      <a href={NASA_LINKS[key]} target="_blank" rel="noreferrer" className="break-all text-sky-400 hover:underline">
                        {NASA_LINKS[key]}
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">{key}: TODO: source needed</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
