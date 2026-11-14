import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { getStatus } from '../lib/status'

const STATUS_COLORS = { GREEN: '#10b981', AMBER: '#fbbf24', RED: '#ef4444' }
const OVERLAYS = {
  co2_mmhg:    { color: '#60a5fa', label: 'CO₂' },
  sodium_mg:   { color: '#fb923c', label: 'Sodium' },
  exercise_min:{ color: '#a78bfa', label: 'Exercise' },
}

function CustomTooltip({ active, payload, baseline }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const lineDiff = d.near_vision != null && baseline != null
    ? Math.round((d.near_vision - baseline) / 0.1)
    : null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs space-y-1 shadow-xl">
      <p className="font-bold text-white">Day {d.mission_day}</p>
      {d.near_vision != null && (
        <p className="text-slate-300">
          Near {d.near_vision.toFixed(2)} logMAR
          {lineDiff != null && (
            <span className={lineDiff > 0 ? ' text-red-400' : lineDiff < 0 ? ' text-emerald-400' : ' text-slate-500'}>
              {' '}({lineDiff > 0 ? '+' : ''}{lineDiff} lines vs baseline)
            </span>
          )}
        </p>
      )}
      {d.contrast != null && <p className="text-slate-300">Contrast {d.contrast}%</p>}
      {d.co2_mmhg != null && <p style={{ color: OVERLAYS.co2_mmhg.color }}>CO₂ {d.co2_mmhg} mmHg</p>}
      {d.status?.level && (
        <p style={{ color: STATUS_COLORS[d.status.level] ?? '#94a3b8' }}>
          {getStatus(d.status.level).label}
        </p>
      )}
    </div>
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

  return (
    <div className="rounded-2xl bg-slate-900 p-4">
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(OVERLAYS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setOverlay(k)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              overlay !== k ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : ''
            }`}
            style={overlay === k ? { backgroundColor: v.color, color: '#0f172a' } : {}}
          >
            {v.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: 36, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="mission_day"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            reversed
            domain={['auto', 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toFixed(1)}
            label={{ value: 'logMAR', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, dy: 30 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: OVERLAYS[overlay].color, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} baseline={baseline} />} />
          {baseline != null && (
            <ReferenceLine
              yAxisId="left"
              y={baseline}
              stroke="#475569"
              strokeDasharray="6 3"
              label={{ value: 'baseline', position: 'insideTopLeft', fill: '#64748b', fontSize: 10 }}
            />
          )}
          {overlay === 'co2_mmhg' && thresholds.co2_mmhg_high != null && (
            <ReferenceLine
              yAxisId="right"
              y={thresholds.co2_mmhg_high}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{ value: 'CO₂ limit (demo)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
            />
          )}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey={overlay}
            fill={OVERLAYS[overlay].color}
            stroke={OVERLAYS[overlay].color}
            fillOpacity={0.12}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="near_vision"
            stroke="#e2e8f0"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props
              if (payload?.near_vision == null) return <g />
              const color = STATUS_COLORS[payload.status?.level] ?? '#94a3b8'
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
              )
            }}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
