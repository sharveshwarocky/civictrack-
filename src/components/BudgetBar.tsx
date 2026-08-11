export function BudgetBar({
  pct,
  color = 'purple',
  className,
  heightClass = 'h-2',
}: {
  pct: number
  color?: 'purple' | 'green' | 'orange' | 'red'
  className?: string
  heightClass?: string
}) {
  const colors = {
    purple: 'from-purple to-fuchsia-500',
    green: 'from-green to-emerald-400',
    orange: 'from-orange to-amber-400',
    red: 'from-red to-rose-400',
  }
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-full bg-white/10 ${className ?? ''}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colors[color]} transition-[width] duration-700 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
