import { useId, type ReactNode } from 'react'
import { compact } from '../lib/format'

/* ---------------- Card wrapper ---------------- */

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 ${className ?? ''}`}>
      {title && (
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-bold tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/* ---------------- KPI stat card ---------------- */

export function StatCard({
  label,
  value,
  sub,
  color = 'text-ink',
  icon,
  accent = 'bg-green/15 text-green',
}: {
  label: string
  value: ReactNode
  sub?: string
  color?: string
  icon?: ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-green/30">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        {icon && <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent}`}>{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] font-medium text-muted">{sub}</p>}
    </div>
  )
}

/* ---------------- Donut (conic-gradient) ---------------- */

export function Donut({
  data,
  size = 170,
  thickness = 24,
  centerLabel,
  centerSub,
}: {
  data: { label: string; value: number; hex: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerSub?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let acc = 0
  const stops =
    total > 0
      ? data
          .filter((d) => d.value > 0)
          .map((d) => {
            const from = (acc / total) * 360
            acc += d.value
            return `${d.hex} ${from.toFixed(1)}deg ${((acc / total) * 360).toFixed(1)}deg`
          })
      : ['#21262D 0deg 360deg']
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      />
      <div className="absolute rounded-full bg-surface" style={{ inset: thickness }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel !== undefined && (
          <span className="text-2xl font-extrabold tracking-tight tabular-nums">{centerLabel}</span>
        )}
        {centerSub && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">{centerSub}</span>}
      </div>
    </div>
  )
}

export function DonutLegend({ data, total }: { data: { label: string; value: number; hex: string }[]; total?: number }) {
  const all = total ?? data.reduce((s, d) => s + d.value, 0)
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2.5 text-[12.5px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.hex, boxShadow: `0 0 8px ${d.hex}66` }} />
          <span className="font-medium text-muted">{d.label}</span>
          <span className="ml-auto font-bold tabular-nums">{d.value}</span>
          <span className="w-10 text-right text-[10.5px] font-semibold text-muted tabular-nums">
            {all > 0 ? Math.round((d.value / all) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ---------------- Horizontal bar list ---------------- */

export function BarList({
  data,
  format,
  color = '#2ECC71',
}: {
  data: { label: string; value: number; sub?: string; hex?: string }[]
  format?: (n: number) => string
  color?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="shrink-0 font-bold tabular-nums" style={{ color: d.hex ?? color }}>
              {format ? format(d.value) : d.value}
            </span>
          </div>
          {d.sub && <p className="text-[10.5px] text-muted">{d.sub}</p>}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(d.value / max) * 100}%`, background: d.hex ?? color, boxShadow: `0 0 10px ${d.hex ?? color}55` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Vertical bar chart ---------------- */

export function VBarChart({
  data,
  color = '#2ECC71',
  height = 150,
}: {
  data: { label: string; value: number }[]
  color?: string
  height?: number
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex h-full flex-1 flex-col justify-end">
          <div className="flex h-full items-end">
            <div
              className="w-full rounded-t-md transition-all duration-700 ease-out group-hover:brightness-125"
              style={{
                height: `${(d.value / max) * 100}%`,
                background: `linear-gradient(180deg, ${color}, ${color}55)`,
                boxShadow: `0 0 12px ${color}26`,
              }}
              title={`${d.label}: ${compact(d.value)}`}
            />
          </div>
          <span className="mt-1.5 truncate text-center text-[9px] font-semibold uppercase text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- SVG area chart ---------------- */

export function AreaChart({
  series,
  labels,
  height = 190,
}: {
  series: { name: string; values: number[]; color: string }[]
  labels: string[]
  height?: number
}) {
  const gid = useId().replace(/:/g, '')
  const w = 100
  const h = 100
  const n = labels.length
  const step = w / Math.max(n - 1, 1)
  const max = Math.max(...series.flatMap((s) => s.values), 1) * 1.15

  const toPoints = (values: number[]) => values.map((v, i) => [i * step, h - (v / max) * h] as const)

  return (
    <div>
      <div className="relative" style={{ height }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-white/10" style={{ top: `${f * 100}%` }} />
        ))}
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            {series.map((s) => (
              <linearGradient key={s.name} id={`${gid}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {series.map((s) => {
            const pts = toPoints(s.values)
            const line = 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L')
            const area = `${line} L ${w},${h} L 0,${h} Z`
            return (
              <g key={s.name}>
                <path d={area} fill={`url(#${gid}-${s.name})`} />
                <path
                  d={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle
                  cx={pts[pts.length - 1][0]}
                  cy={pts[pts.length - 1][1]}
                  r="2.2"
                  fill={s.color}
                  style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
                />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[9.5px] font-semibold uppercase text-muted">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
            <span className="font-extrabold text-ink tabular-nums">{compact(s.values[s.values.length - 1])}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
