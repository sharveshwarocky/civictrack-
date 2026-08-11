import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, MapPin, Search } from 'lucide-react'
import { PostCard } from '../components/PostCard'
import { AREAS } from '../lib/areas'
import { useApp } from '../lib/store'

type Filter = 'all' | 'ongoing' | 'completed' | 'urgent'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'urgent', label: 'Urgent' },
]

export default function Home() {
  const { issues, area, setArea, upvoted, toggleUpvote, unreadCount } = useApp()
  const navigate = useNavigate()
  const [areaOpen, setAreaOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  const feed = issues
    .filter((i) => (area ? i.area === area : true))
    .filter((i) => {
      if (filter === 'ongoing') return i.status === 'in_progress' || i.status === 'under_review' || i.status === 'reported'
      if (filter === 'completed') return i.status === 'completed'
      if (filter === 'urgent') return i.status === 'overdue'
      return true
    })

  return (
    <div className="min-h-dvh bg-bg">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/90 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-0">
          <button
            onClick={() => setAreaOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-ink/[0.04] px-3 py-1.5 text-[13px] font-semibold transition-colors nav-hover"
          >
            <MapPin size={13} className="text-green" />
            {area ?? 'Nearby'}
            <ChevronDown size={12} className={`text-muted transition-transform ${areaOpen ? 'rotate-180' : ''}`} />
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

        {/* area dropdown */}
        {areaOpen && (
          <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface shadow-float">
            <div className="no-scrollbar max-h-72 overflow-y-auto p-2">
              {AREAS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setArea(a.name)
                    setAreaOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors nav-hover ${
                    area === a.name ? 'bg-ink/[0.04]' : ''
                  }`}
                >
                  <span className="text-sm">{a.emoji}</span>
                  <span className="flex-1 text-[13px] font-medium">{a.name}</span>
                  {area === a.name && <span className="h-1.5 w-1.5 rounded-full bg-green" />}
                </button>
              ))}
            </div>
          </div>
        )}

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
          feed.map((issue) => (
            <PostCard key={issue.id} issue={issue} upvoted={!!upvoted[issue.id]} onUpvote={toggleUpvote} />
          ))
        )}
      </main>
    </div>
  )
}
