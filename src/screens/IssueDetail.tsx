import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, BellPlus, Clock, Flag, Link2, MapPin, Share2, ThumbsUp, Trash2 } from 'lucide-react'
import { BudgetBar } from '../components/BudgetBar'
import { CivicMap } from '../components/CivicMap'
import { CoverImage } from '../components/CoverImage'
import { PhotoCarousel } from '../components/PhotoCarousel'
import { ReactionBar } from '../components/ReactionBar'
import { ReportDialog } from '../components/ReportDialog'
import { CategoryChip, StatusChip } from '../components/StatusChip'
import { compact, formatINR, relativeTime, shortDate, slaInfo } from '../lib/format'
import { CATEGORY_META } from '../lib/constants'
import { useApp } from '../lib/store'

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    issues,
    upvoted,
    toggleUpvote,
    following,
    toggleFollow,
    reactions,
    reactToOfficial,
    comments,
    addComment,
    deleteComment,
    deleteIssue,
    reportContent,
    profile,
    loggedIn,
    ensureIssue,
  } = useApp()
  const [comment, setComment] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null) // 'issue' | comment id
  const [reportOpen, setReportOpen] = useState(false)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const [photoTab, setPhotoTab] = useState<'before' | 'after'>('before')

  const issue = issues.find((i) => i.id === id)

  // Deep-links (e.g. from a notification) may point at an older issue that is
  // not in the in-memory feed — fetch it on demand.
  useEffect(() => {
    if (!issue && id) void ensureIssue(id)
  }, [id, issue, ensureIssue])

  if (!issue) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
        <span className="text-4xl">🫥</span>
        <p className="mt-4 text-sm font-semibold">Issue not found</p>
        <Link to="/app/home" className="mt-4 rounded-2xl bg-green px-5 py-2.5 text-sm font-bold text-bg">
          Back to feed
        </Link>
      </div>
    )
  }

  const cat = CATEGORY_META[issue.category]
  const spentPct = issue.budget > 0 ? Math.round((issue.spent / issue.budget) * 100) : 0
  const remaining = Math.max(0, issue.budget - issue.spent)
  const dbList = comments[issue.id] ?? []
  const isUpvoted = !!upvoted[issue.id]
  const isFollowing = !!following[issue.id]
  const isCompleted = issue.status === 'completed'
  const sla = slaInfo(issue)
  const isMine = (uid?: string | null) => !!profile && !!uid && uid === profile.user_id
  const beforePhotos = issue.photos?.length ? issue.photos : [issue.cover]

  const postComment = () => {
    const t = comment.trim()
    if (!t) return
    addComment(issue.id, t)
    setComment('')
  }

  // Two-step inline confirm for destructive actions (post / comment).
  const armDelete = (key: string) => {
    if (confirmDel === key) {
      setConfirmDel(null)
      return
    }
    setConfirmDel(key)
    window.setTimeout(() => setConfirmDel((cur) => (cur === key ? null : cur)), 4000)
  }

  const confirmDeleteIssue = async () => {
    setConfirmDel(null)
    const err = await deleteIssue(issue.id)
    if (err) {
      console.warn('delete issue failed:', err)
      return
    }
    navigate('/app/home', { replace: true })
  }

  const confirmDeleteComment = async (commentId: string) => {
    setConfirmDel(null)
    const err = await deleteComment(issue.id, commentId)
    if (err) console.warn('delete comment failed:', err)
  }

  const share = async () => {
    setShareMsg(null)
    const url = window.location.origin + `/issue/${issue.id}`
    const text = `${issue.title} — report on CivicTrack`
    // Native share sheet where available, copy-link fallback everywhere.
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url })
        return
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied to clipboard 🔗')
      window.setTimeout(() => setShareMsg(null), 2500)
    } catch {
      setShareMsg(url)
    }
  }

  const canDeletePost = isMine(issue.user_id)

  return (
    <div className="min-h-dvh bg-bg">
      {/* hero */}
      <div className="relative">
        <PhotoCarousel photos={beforePhotos} className="relative h-72 w-full">
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform active:scale-90"
              aria-label="Back"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="flex gap-2">
              {canDeletePost &&
                (confirmDel === 'issue' ? (
                  <button
                    onClick={() => void confirmDeleteIssue()}
                    className="flex items-center gap-1.5 rounded-full bg-red px-3.5 py-2.5 text-[12px] font-bold text-white backdrop-blur-md transition-transform active:scale-95"
                  >
                    <Trash2 size={14} /> Confirm delete?
                  </button>
                ) : (
                  <button
                    onClick={() => armDelete('issue')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red/80 text-white backdrop-blur-md transition-transform active:scale-90 hover:bg-red"
                    aria-label="Delete report"
                    title="Delete this report"
                  >
                    <Trash2 size={16} />
                  </button>
                ))}
              <button
                onClick={() => setReportOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform active:scale-90"
                aria-label="Report"
                title="Report this post"
              >
                <Flag size={16} />
              </button>
              <button
                onClick={() => void share()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform active:scale-90"
                aria-label="Share"
              >
                <Share2 size={17} />
              </button>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 z-20 flex gap-2">
            <CategoryChip label={cat.label} emoji={cat.emoji} />
            <StatusChip status={issue.status} />
          </div>
        </PhotoCarousel>
      </div>

      {shareMsg && (
        <div className="fixed inset-x-0 top-3 z-[70] flex justify-center px-4">
          <span className="flex max-w-sm items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[11.5px] font-semibold text-bg shadow-float">
            <Link2 size={12} /> {shareMsg}
          </span>
        </div>
      )}

      {/* title + reporter */}
      <div className="px-4 pt-4">
        <h1 className="text-xl font-extrabold leading-tight tracking-tight">{issue.title}</h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
          <MapPin size={13} /> {issue.area} · reported {relativeTime(issue.createdAt)}
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink/80">{issue.description}</p>
        <div className="mt-4 flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${issue.reporter.color}, ${issue.reporter.color}77)` }}
          >
            {issue.reporter.name[0]}
          </span>
          <div>
            <div className="flex items-center gap-1 text-[13px] font-bold">
              {issue.reporter.name} {issue.reporter.verified && <BadgeCheck size={14} className="text-blue" />}
            </div>
            <div className="text-[11px] text-muted">Reporter · anonymous</div>
          </div>
          <button
            onClick={() => toggleFollow(issue.id)}
            className={`ml-auto rounded-full px-4 py-2 text-[12px] font-bold transition-all active:scale-95 ${
              isFollowing ? 'bg-green/10 text-green' : 'bg-green text-bg'
            }`}
          >
            {isFollowing ? 'Following ✓' : 'Follow'}
          </button>
        </div>
      </div>

      {/* quick stats */}
      <div className="mt-5 grid grid-cols-3 gap-2 px-4">
        <div className="rounded-xl bg-surface p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Days</p>
          <p className="text-lg font-extrabold text-orange">{issue.days}</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Support</p>
          <p className="text-lg font-extrabold text-green">{compact(issue.upvotes)}</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Following</p>
          <p className="text-lg font-extrabold text-blue">{compact(issue.followers)}</p>
        </div>
      </div>

      {/* before/after proof — clean tabs replace the drag slider */}
      <section className="mt-7 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Before → After</h2>
          {isCompleted && issue.afterCover ? (
            <span className="text-[11px] font-semibold text-green">✓ Proof of work</span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange">
              <Clock size={12} /> Not completed
            </span>
          )}
        </div>

        <div className="mt-3">
          {issue.afterCover ? (
            <>
              {/* toggle: Before shows citizen photos, After shows completion proof */}
              <div className="mb-2 flex gap-1 rounded-xl bg-surface p-1">
                {(['before', 'after'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPhotoTab(t)}
                    className={`flex-1 rounded-lg py-1.5 text-[12px] font-bold capitalize transition-all ${
                      photoTab === t ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {t}
                    {t === 'after' && <span className="ml-1 text-[10px] font-semibold text-green">✓</span>}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                {photoTab === 'before' ? (
                  <PhotoCarousel photos={beforePhotos} className="relative h-56 w-full" />
                ) : (
                  <CoverImage cover={issue.afterCover} className="relative h-56 w-full">
                    <span className="absolute bottom-2.5 left-2.5 z-10 rounded-full bg-green/90 px-2.5 py-1 text-[10px] font-bold text-bg backdrop-blur-md">
                      ✓ Completed
                    </span>
                  </CoverImage>
                )}
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line">
              <PhotoCarousel photos={beforePhotos} className="relative h-56 w-full">
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/45 p-5 text-center backdrop-blur-[2px]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl">
                    {isCompleted ? '📸' : '🕒'}
                  </span>
                  <p className="text-[13px] font-bold text-white">
                    {isCompleted ? 'Completion photo pending' : 'Work not completed yet'}
                  </p>
                  <p className="max-w-[260px] text-[11px] leading-relaxed text-white/70">
                    {isCompleted
                      ? 'The organization has marked this complete — the after photo is on its way.'
                      : 'The organization will post the after photo here once the work is completed.'}
                  </p>
                </div>
              </PhotoCarousel>
            </div>
          )}
        </div>
      </section>

      {/* budget transparency */}
      <section className="mt-7 px-4">
        <h2 className="text-[15px] font-bold">Budget transparency</h2>
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Total budget</p>
              <p className="mt-0.5 text-2xl font-extrabold text-purple">{formatINR(issue.budget)}</p>
            </div>
            <div className="text-right text-[11px] font-semibold text-muted">{spentPct}% utilised</div>
          </div>
          <BudgetBar pct={spentPct} color="purple" className="mt-3" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface2 p-3">
              <p className="text-[10px] font-semibold uppercase text-muted">Spent</p>
              <p className="mt-0.5 text-sm font-bold text-green">{formatINR(issue.spent)}</p>
            </div>
            <div className="rounded-xl bg-surface2 p-3">
              <p className="text-[10px] font-semibold uppercase text-muted">Remaining</p>
              <p className="mt-0.5 text-sm font-bold text-orange">{formatINR(remaining)}</p>
            </div>
          </div>
          {issue.contractor && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
              🏗️ Contractor: <span className="font-semibold text-ink">{issue.contractor}</span>
            </p>
          )}
          {(issue.expectedAt || issue.expected) && !isCompleted && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
              📅 Expected completion:{' '}
              <span
                className={`font-semibold ${
                  sla?.tone === 'overdue' ? 'text-red' : sla?.tone === 'warn' ? 'text-orange' : 'text-ink'
                }`}
              >
                {shortDate(issue.expectedAt) ?? issue.expected}
              </span>
              {sla && <span className="text-faint">· {sla.text}</span>}
            </p>
          )}
        </div>
      </section>

      {/* verified timeline */}
      <section className="mt-7 px-4">
        <h2 className="text-[15px] font-bold">Verified timeline</h2>
        <div className="mt-4">
          {issue.timeline.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
                    step.done ? 'border-green/40 bg-green/15 text-green' : 'border-line bg-surface2 text-muted'
                  }`}
                >
                  {step.done ? '✓' : i + 1}
                </div>
                {i < issue.timeline.length - 1 && (
                  <div className={`w-0.5 flex-1 ${step.done ? 'bg-green/40' : 'bg-line'}`} />
                )}
              </div>
              <div className="pb-5">
                <p className={`text-sm font-semibold ${step.done ? 'text-ink' : 'text-muted'}`}>{step.label}</p>
                <p className="text-[11px] text-muted">{step.date}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* official response */}
      {issue.official && (
        <section className="mt-7 px-4">
          <h2 className="text-[15px] font-bold">Official response</h2>
          <div className="mt-3 rounded-2xl border border-line bg-bg/70 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue/15 text-lg">🏛️</span>
              <div className="flex items-center gap-1 text-[13px] font-bold">
                {issue.official.agency} <BadgeCheck size={15} className="text-blue" />
              </div>
              <span className="ml-auto text-[11px] text-muted">{relativeTime(issue.official.postedAt)}</span>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink/85">{issue.official.text}</p>
            {issue.official.progress !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <BudgetBar pct={issue.official.progress} color="green" />
                </div>
                <span className="text-[11px] font-bold text-green">{issue.official.progress}%</span>
              </div>
            )}
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Citizen sentiment · reactions only</p>
              <ReactionBar
                reactions={issue.official.reactions}
                active={reactions[issue.id]}
                onReact={(r) => reactToOfficial(issue.id, r)}
                size="sm"
              />
            </div>
          </div>
        </section>
      )}

      {/* community comments */}
      <section className="mt-7 px-4">
        <h2 className="text-[15px] font-bold">Community · {dbList.length}</h2>
        <div className="mt-3 space-y-3">
          {dbList.length === 0 && (
            <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-[12px] text-muted">
              No comments yet — be the first to respond.
            </p>
          )}
          {dbList.map((c) => {
            const mine = isMine(c.user_id)
            const name = c.username ?? c.name ?? 'Citizen'
            return (
              <div key={c.id} className="flex gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    mine ? 'bg-green/20 text-green' : 'bg-surface2 text-muted'
                  }`}
                >
                  {name[0]}
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-2xl rounded-tl-sm px-3 py-2.5 ${
                    mine ? 'border border-green/20 bg-green/5' : 'bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[12px] font-bold">
                    {mine ? <span className="text-green">You</span> : name}
                    <span className="text-[10px] font-medium text-muted">{c.created_at ? relativeTime(c.created_at) : c.time}</span>
                    {mine &&
                      (confirmDel === c.id ? (
                        <button
                          onClick={() => void confirmDeleteComment(c.id)}
                          className="ml-auto flex items-center gap-1 rounded-full bg-red px-2 py-0.5 text-[10px] font-bold text-white transition-transform active:scale-95"
                        >
                          <Trash2 size={11} /> Confirm?
                        </button>
                      ) : (
                        <button
                          onClick={() => armDelete(c.id)}
                          className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-red/10 hover:text-red"
                          aria-label="Delete comment"
                          title="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      ))}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink/85">{c.text}</p>
                </div>
              </div>
            )
          })}
        </div>
        {loggedIn ? (
          <div className="mt-4 flex items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') postComment()
              }}
              placeholder={`Comment as @${profile?.username ?? 'anonymous'}…`}
              className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] text-ink outline-none placeholder:text-muted/50 focus:border-green/50"
            />
            <button
              onClick={postComment}
              className="rounded-2xl bg-green px-5 py-3 text-sm font-bold text-bg transition-transform active:scale-95"
            >
              Post
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-[12px] text-muted">Sign in to join the conversation.</p>
            <Link
              to="/login"
              className="shrink-0 rounded-full bg-green px-4 py-2 text-[12px] font-bold text-bg transition-transform active:scale-95"
            >
              Sign in
            </Link>
          </div>
        )}
      </section>

      {/* map */}
      <section className="mt-7 px-4">
        <h2 className="text-[15px] font-bold">On the map</h2>
        <div className="mt-3 h-44 overflow-hidden rounded-2xl border border-line">
          <CivicMap
            center={[issue.lat, issue.lng]}
            zoom={14}
            markers={[{ id: issue.id, lat: issue.lat, lng: issue.lng, color: '#3498DB' }]}
          />
        </div>
      </section>

      {/* sticky action bar */}
      <div className="sticky bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-line bg-surface/95 p-3 backdrop-blur-xl">
        <div className="flex gap-2">
          <button
            onClick={() => toggleUpvote(issue.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all active:scale-95 ${
              isUpvoted ? 'bg-green text-bg' : 'bg-green/10 text-green'
            }`}
          >
            <ThumbsUp size={17} /> Support · {compact(issue.upvotes)}
          </button>
          <button
            onClick={() => toggleFollow(issue.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all active:scale-95 ${
              isFollowing ? 'border-green/40 bg-green/10 text-green' : 'border-line bg-surface2 text-ink'
            }`}
          >
            <BellPlus size={17} /> {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="issue"
        targetId={issue.id}
        onReport={reportContent}
      />
    </div>
  )
}
