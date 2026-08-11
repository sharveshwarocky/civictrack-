import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BadgeCheck, TrendingUp } from 'lucide-react'
import { budgetShort } from '../lib/format'
import { useApp } from '../lib/store'

export function RightRail() {
  const { issues, trending } = useApp()

  const open = issues.filter((i) => i.status !== 'completed').length
  const resolved = issues.filter((i) => i.status === 'completed').length
  const budgetTracked = issues.reduce((s, i) => s + i.budget, 0)
  const areaCount = new Set(issues.map((i) => i.area)).size

  const pulse = [
    { label: 'Open', value: String(open), color: 'text-orange' },
    { label: 'Resolved', value: String(resolved), color: 'text-green' },
    { label: 'Tracked', value: budgetShort(budgetTracked), color: 'text-purple' },
    { label: 'Areas', value: String(areaCount), color: 'text-blue' },
  ]

  // Trending = hot issues by engagement (server-computed).
  const trendingList = trending.slice(0, 5).map((i, idx) => ({
    rank: idx + 1,
    id: i.id,
    title: i.title,
    emoji: i.cover.type === 'image' ? '📸' : '🔥',
    score: i.upvotes + i.comments,
  }))

  const updates = useMemo(
    () => issues.filter((i) => i.official).slice(0, 3),
    [issues],
  )

  return (
    <aside
      aria-label="Related content"
      className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-line/60 bg-bg/90 px-4 py-5 backdrop-blur-xl no-scrollbar lg:flex"
    >
      {/* civic pulse */}
      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
          </span>
          <h3 className="text-[12px] font-semibold">Civic pulse</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {pulse.map((s) => (
            <div key={s.label} className="rounded-lg bg-ink/[0.02] p-2.5">
              <p className={`text-[14px] font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* trending */}
      <section className="rounded-xl border border-line bg-surface p-4">
        <Link to="/app/search" className="flex items-center gap-2 text-[12px] font-semibold text-soft nav-hover">
          <TrendingUp size={13} className="text-orange" /> Trending
          <ArrowUpRight size={11} className="ml-auto text-faint" />
        </Link>
        <div className="mt-2.5 space-y-0.5">
          {trendingList.length === 0 && (
            <p className="rounded-lg border border-line bg-ink/[0.015] p-2.5 text-[11px] leading-relaxed text-muted">
              Nothing hot yet — reports that gain support appear here.
            </p>
          )}
          {trendingList.map((t) => (
            <Link
              key={t.rank}
              to={`/issue/${t.id}`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors nav-hover"
            >
              <span className="w-3.5 text-[11px] font-bold text-faint">{t.rank}</span>
              <span className="text-[12px]">{t.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium">{t.title}</span>
                <span className="block text-[9px] text-faint">🔥 {t.score} engagement</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* latest official updates */}
      <section className="rounded-xl border border-line bg-surface p-4">
        <Link to="/app/updates" className="flex items-center gap-2 text-[12px] font-semibold text-soft nav-hover">
          <BadgeCheck size={13} className="text-blue" /> Latest updates
          <ArrowUpRight size={11} className="ml-auto text-faint" />
        </Link>
        <div className="mt-2.5 space-y-2">
          {updates.length === 0 && (
            <p className="rounded-lg border border-line bg-ink/[0.015] p-2.5 text-[11px] leading-relaxed text-muted">
              No official updates yet — they appear here as soon as agencies post them.
            </p>
          )}
          {updates.map((u) => (
            <Link
              key={u.id}
              to={`/issue/${u.id}`}
              className="block rounded-lg border border-line bg-ink/[0.015] p-2.5 transition-colors nav-hover hover:border-line-light"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                {u.official?.agency} <BadgeCheck size={11} className="shrink-0 text-blue" />
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{u.official?.text}</p>
              <p className="mt-1.5 text-[9px] text-faint">{u.official?.time}</p>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  )
}
