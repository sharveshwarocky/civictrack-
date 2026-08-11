import { STATUS_META } from '../lib/constants'
import type { Status } from '../lib/types'

const COLORS: Record<string, string> = {
  green: 'bg-green/10 text-green',
  red: 'bg-red/10 text-red',
  orange: 'bg-orange/10 text-orange',
  blue: 'bg-blue/10 text-blue',
}
const DOTS: Record<string, string> = {
  green: 'bg-green',
  red: 'bg-red',
  orange: 'bg-orange',
  blue: 'bg-blue',
}

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold leading-none ${COLORS[meta.color]} ${className ?? ''}`}
    >
      <span className={`h-1 w-1 rounded-full ${DOTS[meta.color]} ${status === 'overdue' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  )
}

export function CategoryChip({ label, emoji, className }: { label: string; emoji: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold leading-none text-white backdrop-blur-md ${className ?? ''}`}
    >
      <span className="leading-none">{emoji}</span>
      <span className="leading-none">{label}</span>
    </span>
  )
}
