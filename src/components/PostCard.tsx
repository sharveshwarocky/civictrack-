import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Link2, MapPin, MessageCircle, Share2, ThumbsUp, Timer, Users, Wallet } from 'lucide-react'
import { budgetShort, compact, relativeTime, slaInfo } from '../lib/format'
import { CATEGORY_META } from '../lib/constants'
import type { Issue } from '../lib/types'
import { Avatar } from './Avatar'
import { CommentSheet } from './CommentSheet'
import { PhotoCarousel } from './PhotoCarousel'
import { CategoryChip, StatusChip } from './StatusChip'

export function PostCard({
  issue,
  upvoted,
  onUpvote,
}: {
  issue: Issue
  upvoted: boolean
  onUpvote: (id: string) => void
}) {
  const cat = CATEGORY_META[issue.category]
  const sla = slaInfo(issue)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const photos = issue.photos?.length ? issue.photos : [issue.cover]

  const share = async () => {
    setShareMsg(null)
    const url = window.location.origin + `/issue/${issue.id}`
    const text = `${issue.title} — report on CivicTrack`
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url })
        return
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied 🔗')
      window.setTimeout(() => setShareMsg(null), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <article className="anim-rise mb-5 overflow-hidden rounded-xl border border-line bg-surface transition-all card-hover">
      {/* header */}
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-0">
        <Avatar color={issue.reporter.color} name={issue.reporter.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
            {issue.reporter.name}
            {issue.reporter.verified && <BadgeCheck size={14} className="shrink-0 text-blue" />}
          </div>
          <div className="text-[11px] text-muted">
            {issue.area} · {relativeTime(issue.createdAt)}
          </div>
        </div>
        {issue.days > 0 && (
          <span className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted">
            {issue.days}d
          </span>
        )}
      </div>

      {/* media — swipable when multiple photos */}
      <Link to={`/issue/${issue.id}`} className="block">
        <PhotoCarousel photos={photos} className="relative mx-3.5 mt-3 h-56 overflow-hidden rounded-lg">
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap gap-1.5">
            <CategoryChip label={cat.label} emoji={cat.emoji} />
            <StatusChip status={issue.status} />
          </div>
          {issue.completionPct !== undefined && issue.status !== 'completed' && (
            <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-lg bg-black/50 p-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between text-[10px] font-semibold text-white/90">
                <span>{issue.completionPct}% complete</span>
                {sla && (
                  <span className={sla.tone === 'overdue' ? 'text-red' : sla.tone === 'warn' ? 'text-orange' : 'text-white/75'}>
                    {sla.text}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-green"
                  style={{ width: `${issue.completionPct}%` }}
                />
              </div>
            </div>
          )}
        </PhotoCarousel>
      </Link>

      {/* title + description */}
      <div className="px-3.5 pt-3">
        <Link to={`/issue/${issue.id}`}>
          <h3 className="text-[14px] font-semibold leading-snug tracking-tight">{issue.title}</h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{issue.description}</p>
      </div>

      {/* data strip — budgets are always the real sanctioned values */}
      <div className="mx-3.5 mt-2.5 flex items-center gap-3 rounded-lg bg-ink/[0.02] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple">
          <Wallet size={12} /> {budgetShort(issue.budget)}
        </div>
        <div className="h-3 w-px bg-line" />
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <Timer size={12} />
          {sla ? <span className={sla.tone === 'overdue' ? 'font-semibold text-red' : ''}>{sla.text}</span> : `${issue.days}d`}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-blue">
          <Users size={12} /> {compact(issue.followers)}
        </div>
      </div>

      {/* actions */}
      <div className="mt-2.5 flex items-center border-t border-line/50 px-2 py-1">
        <button
          onClick={() => onUpvote(issue.id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition-all nav-hover ${
            upvoted ? 'bg-green/10 text-green' : 'text-muted'
          }`}
        >
          <ThumbsUp size={15} className={upvoted ? 'anim-pop' : ''} />
          {compact(issue.upvotes)}
        </button>
        <button
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-muted transition-all nav-hover hover:bg-ink/5 hover:text-soft"
          aria-label="Comments"
        >
          <MessageCircle size={15} /> {issue.comments}
        </button>
        <button
          onClick={() => void share()}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-muted transition-all nav-hover hover:bg-ink/5 hover:text-soft"
          aria-label="Share"
        >
          <Share2 size={15} />
        </button>
        {shareMsg && (
          <span className="flex items-center gap-1 text-[10.5px] font-semibold text-green">
            <Link2 size={11} /> {shareMsg}
          </span>
        )}
        <Link
          to={`/app/map?focus=${issue.id}`}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-blue nav-hover"
        >
          <MapPin size={14} /> Map
        </Link>
      </div>

      {/* official response */}
      {issue.official && (
        <div className="mx-3.5 mb-3.5 rounded-lg border border-line bg-ink/[0.015] p-3">
          <div className="flex items-center gap-2">
            <Avatar color="#2979FF" name="GOV" size={22}>
              <span className="text-[9px]">🏛️</span>
            </Avatar>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              {issue.official.agency} <BadgeCheck size={12} className="text-blue" />
            </div>
            <span className="ml-auto text-[10px] text-faint">{relativeTime(issue.official.postedAt)}</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-soft">{issue.official.text}</p>
        </div>
      )}

      <CommentSheet issueId={issue.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </article>
  )
}
