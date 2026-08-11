import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, MapPin, Search } from 'lucide-react'
import { PostCard } from '../components/PostCard'
import { LocationPicker } from '../components/LocationPicker'
import { useApp } from '../lib/store'

type Filter = 'all' | 'ongoing' | 'completed' | 'urgent'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'urgent', label: 'Urgent' },
]

export default function Home() {
  const { issues, area, setArea, upvoted, toggleUpvote, unreadCount, hasMore, loadMore } = useApp()
  const navigate = useNavigate()
  const [areaOpen, setAreaOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const feed = issues
    .filter((i) => !i.hidden) // realtime moderation takes effect live
    .filter((i) => (area ? i.area === area : true))
    .filter((i) => {
      if (filter === 'ongoing') return i.status === 'in_progress' || i.status === 'under_review' || i.status === 'reported'
      if (filter === 'completed') return i.status === 'completed'
      if (filter === 'urgent') return i.status === 'overdue'
      return true
    })

  // Infinite scroll: load the next page when the sentinel enters the viewport.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingRef.current) return
        loadingRef.current = true
        void loadMore().finally(() => {
          loadingRef.current = false
        })
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadMore, feed.length])

  return (
    <div className="min-h-dvh bg-bg">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/90 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-0">
          <button
            onClick={() => setAreaOpen(true)}
            className="flex max-w-[60%] items-center gap-1.5 rounded-lg bg-ink/[0.04] px-3 py-1.5 text-[13px] font-semibold transition-colors nav-hover"
          >
            <MapPin size={13} className="shrink-0 text-green" />
            <span className="truncate">{area ?? 'Nearby'}</span>
            <ChevronDown size={12} className={`shrink-0 text-muted transition-transform ${areaOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => navigate('/app/search')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors nav-hover hover:text-soft"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => navigate('/app/notifications')}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors nav-hover hover:text-soft"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red px-1 text-[8px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* filter chips */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                filter === f.key
                  ? 'bg-ink text-bg'
                  : 'bg-ink/[0.04] text-muted hover:bg-ink/[0.06] hover:text-soft'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* feed */}
      <main className="px-4 pt-4">
        {feed.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/[0.03]">
              <span className="text-2xl">🗺️</span>
            </div>
            <p className="mt-5 text-[14px] font-semibold">No issues here yet</p>
            <p className="mt-1 text-[12px] text-muted">Be the first to report one in this area.</p>
            <button
              onClick={() => navigate('/app/create')}
              className="mt-5 rounded-xl bg-green px-5 py-2.5 text-[12px] font-semibold text-bg shadow-[0_2px_12px_rgba(0,200,83,0.2)] btn-press"
            >
              + Report an issue
            </button>
          </div>
        ) : (
          <>
            {feed.map((issue) => (
              <PostCard key={issue.id} issue={issue} upvoted={!!upvoted[issue.id]} onUpvote={toggleUpvote} />
            ))}
            {/* infinite-scroll sentinel */}
            <div ref={sentinelRef} className="flex items-center justify-center py-6">
              {hasMore ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-green/30 border-t-green" />
              ) : (
                <span className="text-[11px] text-faint">You're all caught up 🎉</span>
              )}
            </div>
          </>
        )}
      </main>

      {/* world location chooser */}
      <LocationPicker open={areaOpen} onClose={() => setAreaOpen(false)} onSelect={setArea} current={area} />
    </div>
  )
}
