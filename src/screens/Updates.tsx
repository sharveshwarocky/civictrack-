import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { CoverImage } from '../components/CoverImage'
import { relativeTime } from '../lib/format'
import { ReactionBar } from '../components/ReactionBar'
import { ScreenHeader } from '../components/ScreenHeader'
import { useApp } from '../lib/store'
import type { Reactions } from '../lib/types'

const FILTERS = ['All', 'Ongoing', 'Completed'] as const
type Filter = (typeof FILTERS)[number]

export default function Updates() {
  const { issues, reactions, reactToOfficial } = useApp()
  const [filter, setFilter] = useState<Filter>('All')

  const posts = useMemo(
    () =>
      issues
        .filter((i) => i.official)
        .filter((i) => {
          if (filter === 'Ongoing') return i.status !== 'completed'
          if (filter === 'Completed') return i.status === 'completed'
          return true
        })
        .slice(0, 30),
    [issues, filter],
  )

  return (
    <div className="min-h-dvh bg-bg">
      <ScreenHeader
        title="Updates"
        right={
          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue">
            <BadgeCheck size={13} /> Verified only
          </span>
        }
      />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              filter === f ? 'bg-green text-bg' : 'bg-surface text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="px-4">
        {posts.length === 0 && (
          <div className="flex flex-col items-center px-6 pt-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/[0.03] text-3xl">🏛️</span>
            <p className="mt-5 text-[14px] font-semibold">No official updates yet</p>
            <p className="mt-1 text-[12px] text-muted">
              Verified updates from agencies appear here as they're posted on reports.
            </p>
          </div>
        )}
        {posts.map((issue) => {
          const active = reactions[issue.id]
          const base: Reactions = issue.official!.reactions
          const display: Reactions = {
            up: base.up + (active === 'up' ? 1 : 0),
            heart: base.heart + (active === 'heart' ? 1 : 0),
            down: base.down + (active === 'down' ? 1 : 0),
          }
          return (
            <article key={issue.id} className="anim-rise mb-4 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-lg">
                  🏛️
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[13px] font-bold">
                    <span className="truncate">{issue.official!.agency}</span>{' '}
                    <BadgeCheck size={14} className="shrink-0 text-blue" />
                  </div>
                  <div className="text-[11px] text-muted">{relativeTime(issue.official!.postedAt)}</div>
                </div>
                <Link
                  to={`/issue/${issue.id}`}
                  className="rounded-full bg-blue/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-blue transition-colors hover:bg-blue/20"
                >
                  View report
                </Link>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink/85">{issue.official!.text}</p>
              {issue.official!.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                    <span>Progress</span>
                    <span className="text-green">{issue.official!.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green to-emerald-400"
                      style={{ width: `${issue.official!.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {issue.status === 'completed' && issue.afterCover ? (
                <CoverImage cover={issue.afterCover} className="mt-3 h-40 w-full rounded-xl" />
              ) : issue.cover.type === 'image' ? (
                <CoverImage cover={issue.cover} className="mt-3 h-40 w-full rounded-xl" />
              ) : null}
              <div className="mt-4">
                <ReactionBar reactions={display} active={active} onReact={(r) => reactToOfficial(issue.id, r)} size="sm" />
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
