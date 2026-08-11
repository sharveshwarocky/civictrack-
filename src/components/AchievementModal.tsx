import { Lock, Trophy, X } from 'lucide-react'
import type { Achievement } from '../lib/achievements'

/** Tap-to-open achievement detail popup — shows requirement + live progress. */
export function AchievementModal({
  achievement,
  value,
  earned,
  onClose,
}: {
  achievement: Achievement
  value: number
  earned: boolean
  onClose: () => void
}) {
  const pct = achievement.max > 0 ? Math.min(100, Math.round((value / achievement.max) * 100)) : earned ? 100 : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-rise relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-line bg-surface shadow-float">
        {/* header band */}
        <div
          className={`flex flex-col items-center px-6 pb-5 pt-8 text-center ${
            earned ? 'bg-gradient-to-b from-green/15 to-transparent' : 'bg-ink/[0.03]'
          }`}
        >
          <span
            className={`flex h-20 w-20 items-center justify-center rounded-3xl text-4xl transition-transform ${
              earned ? 'bg-green/15 shadow-[0_8px_30px_rgba(0,200,83,0.25)]' : 'bg-ink/[0.05] opacity-50 grayscale'
            }`}
          >
            {achievement.emoji}
          </span>
          <p
            className={`mt-4 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] ${
              earned ? 'text-green' : 'text-muted'
            }`}
          >
            {earned ? (
              <>
                <Trophy size={11} /> Earned
              </>
            ) : (
              <>
                <Lock size={10} /> Locked
              </>
            )}
          </p>
          <h3 className="mt-1 text-[18px] font-extrabold tracking-tight">{achievement.label}</h3>
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.06] text-muted transition-colors hover:text-ink"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="px-6 pb-6">
          <p className="text-center text-[12.5px] leading-relaxed text-muted">{achievement.desc}</p>

          {achievement.max > 0 && (
            <div className="mt-5">
              <div className="flex items-end justify-between text-[11px] font-semibold">
                <span className="text-muted">Progress</span>
                <span className={earned ? 'text-green' : 'text-ink'}>
                  {Math.min(value, achievement.max)} / {achievement.max}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${earned ? 'bg-green' : 'bg-green/50'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-ink/[0.06] py-3 text-[13px] font-bold transition-colors hover:bg-ink/10"
          >
            {earned ? 'Nice work!' : 'Keep at it'}
          </button>
        </div>
      </div>
    </div>
  )
}
