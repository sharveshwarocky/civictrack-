import { compact } from '../lib/format'
import type { Reactions } from '../lib/types'

export function ReactionBar({
  reactions,
  active,
  onReact,
  size = 'md',
}: {
  reactions: Reactions
  active?: 'up' | 'heart' | 'down'
  onReact?: (r: 'up' | 'heart' | 'down') => void
  size?: 'sm' | 'md'
}) {
  const items = [
    { key: 'up' as const, emoji: '👍', label: 'Support' },
    { key: 'heart' as const, emoji: '❤️', label: 'Appreciate' },
    { key: 'down' as const, emoji: '👎', label: 'Disagree' },
  ]
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'flex-1 px-2 py-2.5 text-[13px]'
  return (
    <div className="flex gap-2">
      {items.map((it) => {
        const isActive = active === it.key
        return (
          <button
            key={it.key}
            onClick={() => onReact?.(it.key)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border font-semibold transition-all active:scale-95 ${pad} ${
              isActive
                ? 'border-green/40 bg-green/15 text-green'
                : 'border-line bg-surface2 text-ink/80 hover:bg-ink/5'
            }`}
          >
            <span className="text-base">{it.emoji}</span>
            <span className="tabular-nums">{compact(reactions[it.key])}</span>
            {size === 'md' && <span className="hidden text-[11px] font-medium text-muted sm:inline">{it.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
