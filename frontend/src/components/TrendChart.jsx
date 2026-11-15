import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getLevel, normalizeLevel } from '../utils/status.js'
import { availableFactors, baselineLines, byMissionDay, factorRows, sharedDayDomain } from '../utils/trends.js'
import StatusBadge from './StatusBadge.jsx'

// Chart colours are neutral greys: colour is reserved for status (the dots).
const LEFT_STROKE = '#eeecfb'
const RIGHT_STROKE = '#a199cc'
const RIGHT_DASH = '2 6'
const GRID = '#221a47'
const AXIS = '#a199cc'
// Both charts use the same margins and y-axis width so their x-axes line up exactly.
const MARGIN = { top: 40, right: 24, bottom: 4, left: 4 }
const Y_AXIS_WIDTH = 52

// A dot whose colour AND shape show the status of that check.
function LevelDot({ cx, cy, payload, r = 6 }) {
  if (cx == null || cy == null) return null
  const level = normalizeLevel(payload.level)
  const { color } = getLevel(level)
  const stroke = '#080516'
  if (level === 'GREEN') return <circle cx={cx} cy={cy} r={r} fill={color} stroke={stroke} strokeWidth={2} />
  if (level === 'AMBER')
    return (
      <path d={`M${cx} ${cy - r - 1}L${cx + r + 1} ${cy + r}H${cx - r - 1}Z`} fill={color} stroke={stroke} strokeWidth={2} />
    )
  if (level === 'RED')
    return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} stroke={stroke} strokeWidth={2} />
  return <circle cx={cx} cy={cy} r={r - 1} fill="#080516" stroke={color} strokeWidth={2.5} />
}

// Recharts passes a `key` in the props for custom dots; pull it out instead of spreading it.
const renderDot = ({ key, ...props }) => <LevelDot key={key ?? props.index} {...props} />
const renderActiveDot = ({ key, ...props }) => <LevelDot key={key ?? props.index} {...props} r={8} />

// Event labels alternate between two rows so close events do not overlap.
function EventLabel({ viewBox, text, row }) {
  if (!viewBox) return null
  return (
    <text x={viewBox.x + 5} y={viewBox.y - 22 + row * 14} fill="#c8c2e8" fontSize={12} fontFamily="IBM Plex Sans">
      {text}
    </text>
  )
}

function VisionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  if (p.near_vision_left === undefined) return null
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm shadow-xl">
      <p className="font-mono font-semibold">Mission day {p.mission_day}</p>
      <p className="text-slate-300">Left eye: line {p.near_vision_left ?? '–'}</p>
      <p className="text-slate-300">Right eye: line {p.near_vision_right ?? '–'}</p>
      <StatusBadge level={p.level} size="sm" pulse={false} className="self-start" />
    </div>
  )
}

function FactorTooltip({ active, payload, factor }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  if (p[factor.key] === undefined) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm shadow-xl">
      <p className="font-mono font-semibold">Mission day {p.mission_day}</p>
      <p className="text-slate-300">
        {factor.label}: {p[factor.key]} {factor.unit}
      </p>
    </div>
  )
}

/**
 * Two stacked charts on the same mission-day axis:
 * 1) near vision for each eye, 2) cabin CO₂ or one daily-log field, chosen with the buttons.
 * Lining them up lets you see if a drop in vision happened around a change in a factor.
 */
export default function TrendChart({ trends }) {
  const vision = byMissionDay(trends.vision)
  const events = trends.events ?? []
  const factors = availableFactors(trends) // only factors that have data
  const [factorKey, setFactorKey] = useState(factors[0]?.key)
  const factor = factors.find((f) => f.key === factorKey) ?? factors[0]
  const factorData = factorRows(trends, factor)
  // One x-axis range for both charts, covering tests, cabin and daily data.
  const xDomain = sharedDayDomain(trends.vision ?? [], trends.cabin_co2 ?? [], trends.daily ?? [])
  const baselines = baselineLines(trends.baseline)

  const xAxis = (
    <XAxis
      dataKey="mission_day"
      type="number"
      domain={xDomain}
      allowDecimals={false}
      tickCount={10}
      stroke={AXIS}
      tick={{ fontSize: 13 }}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5" aria-labelledby="vision-chart-title">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 id="vision-chart-title" className="text-xl font-semibold">
            Near vision
          </h2>
          <ChartLegend />
        </div>
        <p className="mb-2 text-sm text-slate-400">Smallest line read (1-10). Higher is better.</p>
        <div className="h-72" role="img" aria-label="Line chart of near vision for each eye by mission day">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vision} syncId="sightline-trends" syncMethod="value" margin={MARGIN}>
              <CartesianGrid stroke={GRID} vertical={false} />
              {xAxis}
              <YAxis domain={[1, 10]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} width={Y_AXIS_WIDTH} stroke={AXIS} tick={{ fontSize: 13 }} />
              <Tooltip content={<VisionTooltip />} cursor={{ stroke: '#51477f' }} />
              {events.map((event, i) => (
                <ReferenceLine
                  key={`${event.mission_day}-${event.label}`}
                  x={event.mission_day}
                  stroke="#51477f"
                  label={<EventLabel text={event.label} row={i % 2} />}
                />
              ))}
              {baselines.map((b) => (
                <ReferenceLine
                  key={b.label}
                  y={b.y}
                  stroke="#c8c2e8"
                  strokeDasharray="8 6"
                  label={{ value: b.label, position: b.position, fill: '#c8c2e8', fontSize: 12 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="near_vision_left"
                name="Left eye"
                stroke={LEFT_STROKE}
                strokeWidth={2.5}
                dot={renderDot}
                activeDot={renderActiveDot}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="near_vision_right"
                name="Right eye"
                stroke={RIGHT_STROKE}
                strokeWidth={2.5}
                strokeDasharray={RIGHT_DASH}
                strokeLinecap="round"
                dot={renderDot}
                activeDot={renderActiveDot}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {factor && (
        <section className="card p-5" aria-labelledby="factor-chart-title">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 id="factor-chart-title" className="text-xl font-semibold">
              Factors studied in SANS
            </h2>
            <div role="group" aria-label="Choose a factor" className="flex flex-wrap gap-2">
              {factors.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={f.key === factor.key}
                  onClick={() => setFactorKey(f.key)}
                  className={`min-h-12 rounded-xl border px-4 text-base transition-colors ${
                    f.key === factor.key
                      ? 'border-sky-400 bg-sky-400/15 text-white'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-2 text-sm text-slate-400">
            {factor.label} per day, in {factor.unit}. Same days as the eye chart above. Researchers study these as possible factors in SANS; a pattern here is not a proven cause.
          </p>
          <div className="h-52" role="img" aria-label={`Line chart of ${factor.label} by mission day`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={factorData} syncId="sightline-trends" syncMethod="value" margin={{ ...MARGIN, top: 12 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                {xAxis}
                <YAxis width={Y_AXIS_WIDTH} stroke={AXIS} tick={{ fontSize: 13 }} domain={['auto', 'auto']} />
                <Tooltip content={<FactorTooltip factor={factor} />} cursor={{ stroke: '#51477f' }} />
                {events.map((event) => (
                  <ReferenceLine key={`${event.mission_day}-${event.label}`} x={event.mission_day} stroke="#51477f" />
                ))}
                <Line type="monotone" dataKey={factor.key} stroke="#e0dcf5" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-sm text-slate-400">Mission day</p>
        </section>
      )}
    </div>
  )
}

function ChartLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
      <li className="flex items-center gap-2">
        <svg width="28" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="28" y2="4" stroke={LEFT_STROKE} strokeWidth="2.5" />
        </svg>
        Left eye
      </li>
      <li className="flex items-center gap-2">
        <svg width="28" height="8" aria-hidden="true">
          <line x1="2" y1="4" x2="28" y2="4" stroke={RIGHT_STROKE} strokeWidth="2.5" strokeDasharray={RIGHT_DASH} strokeLinecap="round" />
        </svg>
        Right eye
      </li>
      {['GREEN', 'AMBER', 'RED'].map((level) => (
        <li key={level} className="flex items-center gap-1.5">
          <svg width="16" height="16" aria-hidden="true">
            <LevelDot cx={8} cy={8} r={5} payload={{ level }} />
          </svg>
          {getLevel(level).word}
        </li>
      ))}
    </ul>
  )
}
