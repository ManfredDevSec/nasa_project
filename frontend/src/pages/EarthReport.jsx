import { Link } from 'react-router-dom'
import { getErrorMessage, getWeeklyReport, isForbidden } from '../api/index.js'
import { ArrowLeftIcon, LogoMark, PrinterIcon } from '../components/Icons.jsx'
import { AccessDenied } from '../components/StateViews.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { INSIGHT_CAPTION } from '../content/learn.js'
import { LEVELS } from '../utils/status.js'
import { fieldsOf, formatValue, labelFor, tableColumns, textOf } from '../utils/report.js'
import { useApi } from '../utils/useApi.js'

// The report is rendered exactly as the API returns it: keys become labels, values are shown as-is.
// So if the backend adds a column or field, it appears here without code changes.

// Status levels become badges; everything else becomes plain text.
function Value({ name, value }) {
  if (typeof value === 'string' && LEVELS[value]) return <StatusBadge level={value} size="sm" tone="light" pulse={false} />
  if (value === null || value === undefined || value === '') return '–'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return formatValue(name, value) ?? String(value)
}

export default function EarthReport() {
  const { data, loading, error, reload } = useApi(getWeeklyReport)

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 print:bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/crew"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-4 font-medium hover:bg-slate-50 focus-visible:outline-sky-600"
            >
              <ArrowLeftIcon className="size-5" /> Back to crew
            </Link>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-5 font-semibold text-white hover:bg-slate-700 focus-visible:outline-sky-600 disabled:opacity-40"
          >
            <PrinterIcon className="size-5" /> Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="mx-auto my-6 max-w-5xl bg-white p-10 shadow-sm print:m-0 print:max-w-none print:p-0 print:shadow-none">
        {loading && (
          <p className="py-20 text-center text-slate-500" role="status">
            Loading weekly report…
          </p>
        )}
        {error && isForbidden(error) && <AccessDenied />}
        {error && !isForbidden(error) && (
          <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-lg font-semibold">Could not load the weekly report</p>
            <p className="text-slate-600">{getErrorMessage(error)}</p>
            <button type="button" onClick={reload} className="min-h-12 rounded-xl bg-slate-900 px-5 font-semibold text-white">
              Try again
            </button>
          </div>
        )}
        {data && <ReportBody report={data} />}
      </article>
    </div>
  )
}

function ReportBody({ report }) {
  const { mission = {}, crew_summary = [], environment = {}, insights = [], recommendations_for_surgeon = [] } = report
  const columns = tableColumns(crew_summary)

  return (
    <div className="flex flex-col gap-8 text-base">
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div>
          <p className="text-sm font-medium text-slate-500">Weekly Earth report</p>
          <h1 className="text-3xl font-semibold">{mission.name ?? 'Mission'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-auto" />
          <span className="font-semibold">Sightline</span>
        </div>
      </header>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold">Mission</h2>
        <KeyValueGrid data={mission} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Crew summary</h2>
        {crew_summary.length === 0 ? (
          <p className="text-slate-600">No crew data for this week.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500">
                  {columns.map((key) => (
                    <th key={key} scope="col" className="py-2 pr-3 align-bottom font-medium">
                      {labelFor(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crew_summary.map((row, i) => (
                  <tr key={i} className="break-inside-avoid border-b border-slate-200 align-top">
                    {columns.map((key) => (
                      <td key={key} className="py-3 pr-3 text-slate-800">
                        <Value name={key} value={row[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold">Environment</h2>
        <KeyValueGrid data={environment} />
      </section>

      <section className="break-inside-avoid">
        <h2 className="text-lg font-semibold">Insights</h2>
        <p className="mb-3 text-sm text-slate-500">{INSIGHT_CAPTION}</p>
        {insights.length === 0 ? (
          <p className="text-slate-600">No patterns found this week.</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-6 text-slate-800">
            {insights.map((item, i) => (
              <li key={i}>{textOf(item)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold">Recommendations for the flight surgeon</h2>
        {recommendations_for_surgeon.length === 0 ? (
          <p className="text-slate-600">None this week.</p>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-6 text-slate-800">
            {recommendations_for_surgeon.map((item, i) => (
              <li key={i}>{textOf(item)}</li>
            ))}
          </ol>
        )}
      </section>

      <footer className="border-t border-slate-300 pt-4 text-sm text-slate-500">
        Prototype, not a medical device. Simulated data. Decision support only; clinical decisions remain with the
        flight surgeon.
      </footer>
    </div>
  )
}

function KeyValueGrid({ data }) {
  const entries = fieldsOf(data)
  if (!entries.length) return <p className="text-slate-600">No data.</p>
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-sm text-slate-500">{labelFor(key)}</dt>
          <dd className="font-medium text-slate-900">
            <Value name={key} value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
