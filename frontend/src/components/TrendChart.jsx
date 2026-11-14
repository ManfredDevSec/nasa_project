import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { getStatus } from '../lib/status'
import { fmt } from '../lib/format'

const STATUS_COLORS = { GREEN: '#6fae7c', AMBER: '#d9a441', RED: '#d0604f' }
const OVERLAYS = {
  co2_mmhg:    { label: 'CO₂',      unit: 'CO₂ (mmHg)',       dp: 1 },
  sodium_mg:   { label: 'Sodium',   unit: 'Sodium (mg/day)',   dp: 0 },
  exercise_min:{ label: 'Exercise', unit: 'Exercise (min/day)', dp: 0 },
}

function CustomTooltip({ active, payload, baseline }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const lineDiff = d.near_vision != null && baseline != null
    ? Math.round((d.near_vision - baseline) / 0.1)
    : null
  return (
    <div
      className="p-3 text-xs space-y-1"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <p className="font-mono font-medium" style={{ color: 'var(--text)' }}>Day {d.mission_day}</p>
      {d.near_vision != null && (
        <p className="font-mono" style={{ color: 'var(--muted)' }}>
          Near {fmt(d.near_vision, 2)} logMAR
          {lineDiff != null && (
            <span style={{ color: lineDiff > 0 ? '#d0604f' : lineDiff < 0 ? '#6fae7c' : '#8a877b' }}>
              {' '}({lineDiff > 0 ? '+' : ''}{lineDiff} lines vs baseline)
            </span>
          )}
        </p>
      )}
      {d.contrast != null && <p className="font-mono" style={{ color: 'var(--muted)' }}>Contrast {fmt(d.contrast, 2)} logCS</p>}
      {d.co2_mmhg != null && <p className="font-mono" style={{ color: 'var(--muted)' }}>CO₂ {fmt(d.co2_mmhg, 1)} mmHg</p>}
      {d.status?.level && (
        <p style={{ color: STATUS_COLORS[d.status.level] ?? '#8a877b' }}>
          {getStatus(d.status.level).label}
        </p>
      )}
    </div>
  )
}

function CustomDot(props, baseline) {
  const { cx, cy, payload } = props
  if (payload?.near_vision == null) return null
  const level = payload.status?.level
  const color = STATUS_COLORS[level] ?? 'var(--dim)'
  const r = level === 'RED' || level === 'AMBER' ? 5 : 4
  return (
    <circle
      key={`dot-${payload.mission_day}`}
      cx={cx} cy={cy} r={r}
      fill={color}
      stroke="var(--bg)"
      strokeWidth={1.5}
    />
  )
}

export default function TrendChart({ checks = [], env = [], thresholds = {} }) {
  const [overlay, setOverlay] = useState('co2_mmhg')

  const data = useMemo(() => {
    const map = {}
    env.forEach(e => {
      map[e.mission_day] = {
        mission_day: e.mission_day,
        co2_mmhg: e.co2_mmhg,
        sodium_mg: e.sodium_mg,
        exercise_min: e.exercise_min,
      }
    })
    checks.forEach(c => {
      map[c.mission_day] = {
        ...(map[c.mission_day] ?? { mission_day: c.mission_day }),
        near_vision: c.near_vision,
        contrast: c.contrast,
        status: c.status,
      }
    })
    return Object.values(map).sort((a, b) => a.mission_day - b.mission_day)
  }, [checks, env])

  const baseline = checks[0]?.near_vision

  const leftTicks = useMemo(() => {
    const vals = data.filter(d => d.near_vision != null).map(d => d.near_vision)
    if (baseline != null) vals.push(baseline)
    if (!vals.length) return undefined
    const minV = Math.min(...vals)
    const maxV = Math.max(...vals)
    const lo = Math.floor((minV - 0.1) * 10) / 10
    const hi = Math.ceil((maxV + 0.1) * 10) / 10
    const ticks = []
    for (let v = lo; v <= hi + 0.0001; v = Math.round((v + 0.1) * 10) / 10) {
      ticks.push(v)
    }
    return ticks
  }, [data, baseline])

  const overlayInfo = OVERLAYS[overlay]

  return (
    <div style={{ backgroundColor: 'var(--surface)', padding: '1rem' }}>
      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 font-mono text-xs" style={{ color: 'var(--muted)' }}>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 20, height: 2, backgroundColor: 'var(--text)', verticalAlign: 'middle' }} />
          Near vision
        </span>
        <span className="flex items-center gap-2">
          {Object.entries(STATUS_COLORS).map(([level, color]) => (
            <span key={level} className="flex items-center gap-1">
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
              {getStatus(level).label}
            </span>
          ))}
        </span>
        <span className="flex items-center gap-1.5 ml-auto flex-wrap">
          {Object.entries(OVERLAYS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setOverlay(k)}
              className="px-2 py-0.5 font-mono text-xs transition-colors duration-150"
              style={{
                border: '1px solid',
                borderColor: overlay === k ? 'var(--muted)' : 'var(--line)',
                color: overlay === k ? 'var(--text)' : 'var(--dim)',
                backgroundColor: 'transparent',
              }}
            >
              {v.label}
            </button>
          ))}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 55, left: 4, bottom: 20 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="none" />
          <XAxis
            dataKey="mission_day"
            tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            reversed
            ticks={leftTicks}
            domain={leftTicks ? [leftTicks[0], leftTicks[leftTicks.length - 1]] : ['auto', 'auto']}
            tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toFixed(2)}
            label={{
              value: 'Near vision (logMAR, worse ↓)',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--muted)',
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              dy: 85,
              dx: 10,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={false}
            label={{
              value: overlayInfo.unit,
              angle: 90,
              position: 'insideRight',
              fill: 'var(--muted)',
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              dy: -50,
              dx: -4,
            }}
          />
          <Tooltip content={props => <CustomTooltip {...props} baseline={baseline} />} />
          {baseline != null && (
            <ReferenceLine
              yAxisId="left"
              y={baseline}
              stroke="var(--line)"
              strokeDasharray="6 3"
              label={{
                value: `baseline ${baseline.toFixed(2)}`,
                position: 'insideRight',
                fill: 'var(--muted)',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            />
          )}
          {overlay === 'co2_mmhg' && thresholds.co2_mmhg_high != null && (
            <ReferenceLine
              yAxisId="right"
              y={thresholds.co2_mmhg_high}
              stroke="var(--watch)"
              strokeDasharray="4 2"
              label={{
                value: `${thresholds.co2_mmhg_high} mmHg limit`,
                position: 'insideTopRight',
                fill: 'var(--watch)',
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            />
          )}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey={overlay}
            fill="var(--muted)"
            stroke="var(--muted)"
            fillOpacity={0.08}
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="near_vision"
            stroke="var(--text)"
            strokeWidth={2}
            connectNulls
            dot={CustomDot}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
