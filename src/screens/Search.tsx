import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, TrendingUp, X } from 'lucide-react'
import { CoverImage } from '../components/CoverImage'
import { ScreenHeader } from '../components/ScreenHeader'
import { StatusChip } from '../components/StatusChip'
import { CATEGORY_META } from '../lib/constants'
import { useApp } from '../lib/store'
import type { Category } from '../lib/types'

const CATS: Category[] = ['Road', 'Water', 'Garbage', 'Electricity', 'Traffic', 'Drainage']

export default function Search() {
  const { issues } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | null>(null)
  const [recent, setRecent] = useState<string[]>([])

  const trending = useMemo(() => {
    const map = new Map<string, { label: string; emoji: string; count: number }>()
    for (const i of issues) {
      const meta = CATEGORY_META[i.category]
      const cur = map.get(i.category) ?? { label: meta.label, emoji: meta.emoji, count: 0 }
      cur.count += 1
      map.set(i.category, cur)
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((t, i) => ({ rank: i + 1, label: t.label, emoji: t.emoji, count: `${t.count} ${t.count === 1 ? 'report' : 'reports'}` }))
  }, [issues])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    return issues.filter((i) => {
      if (cat && i.category !== cat) return false
      if (!term) return true
      return (
        i.title +
        ' ' +
        i.description +
        ' ' +
        i.area +
        ' ' +
        (i.contractor ?? '') +
        ' ' +
        i.category
      )
        .toLowerCase()
        .includes(term)
    })
  }, [issues, q, cat])

  const onInput = (t: string) => setQ(t)

  const commit = (t: string) => {
    setQ(t)
    if (t.trim() && !recent.includes(t.trim())) setRecent((r) => [t.trim(), ...r].slice(0, 3))
  }

  const searching = q.trim().length > 0 || cat !== null

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <ScreenHeader title="Search" />
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-green/50">
          <SearchIcon size={17} className="shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(q)
            }}
            placeholder="Search issues, areas, contractors…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/50"
          />
          {q && (
            <button onClick={() => setQ('')} className="shrink-0 text-muted" aria-label="Clear">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setCat(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              cat === null ? 'bg-green text-bg' : 'bg-surface text-muted'
            }`}
          >
            All
          </button>
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(cat === c ? null : c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                cat === c ? 'bg-green text-bg' : 'bg-surface text-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* trending */}
      {!searching && (
        <div className="mt-5 px-4">
          <div className="flex items-center gap-1.5 text-[13px] font-bold">
            <TrendingUp size={15} className="text-orange" /> Trending today
          </div>
          <div className="mt-2.5 overflow-hidden rounded-2xl border border-line bg-surface">
            {trending.map((t) => (
              <button
                key={t.rank}
                onClick={() => commit(t.label)}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-ink/5"
              >
                <span
                  className={`w-5 text-center text-[13px] font-extrabold ${t.rank <= 3 ? 'text-orange' : 'text-muted'}`}
                >
                  {t.rank}
                </span>
                <span className="text-sm">{t.emoji}</span>
                <span className="flex-1 text-sm font-semibold">{t.label}</span>
                <span className="text-[11px] text-muted">{t.count}</span>
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <div className="mt-5">
              <div className="text-[13px] font-bold">Recent</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => commit(r)}
                    className="rounded-full bg-surface px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
                  >
                    ⏱ {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* results */}
      {searching && results.length > 0 && (
        <div className="mt-4 px-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {results.length} result{results.length > 1 ? 's' : ''}
          </p>
          <div className="mt-2 space-y-2">
            {results.map((i) => (
              <button
                key={i.id}
                onClick={() => navigate(`/issue/${i.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-green/30"
              >
                <CoverImage cover={i.cover} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{i.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    📍 {i.area} · {i.category}
                  </p>
                </div>
                <StatusChip status={i.status} />
              </button>
            ))}
          </div>
        </div>
      )}
      {searching && results.length === 0 && (
        <div className="px-4 pt-16 text-center">
          <span className="text-4xl">🔍</span>
          <p className="mt-3 text-sm font-semibold">No results found</p>
          <p className="mt-1 text-[12px] text-muted">Try a different keyword or category.</p>
        </div>
      )}
    </div>
  )
}
