import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Send, Trash2, X } from 'lucide-react'
import { useApp } from '../lib/store'
import { relativeTime } from '../lib/format'
import { BottomSheet } from './BottomSheet'
import { ReportDialog } from './ReportDialog'

export function CommentSheet({
  issueId,
  open,
  onClose,
}: {
  issueId: string
  open: boolean
  onClose: () => void
}) {
  const { comments, addComment, deleteComment, profile, loggedIn, reportContent } = useApp()
  const [text, setText] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<string | null>(null)

  const list = comments[issueId] ?? []

  const post = () => {
    const t = text.trim()
    if (!t) return
    addComment(issueId, t)
    setText('')
  }

  const doDelete = async (id: string) => {
    setConfirmDel(null)
    const err = await deleteComment(issueId, id)
    if (err) console.warn('delete comment failed:', err)
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Comments · {list.length}</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.05] text-muted transition-colors hover:text-ink"
          aria-label="Close comments"
        >
          <X size={16} />
        </button>
      </div>

      {/* thread */}
      <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
        {list.length === 0 && (
          <p className="rounded-2xl border border-line bg-bg/60 px-4 py-6 text-center text-[12px] text-muted">
            No comments yet — be the first to respond.
          </p>
        )}
        {list.map((c) => {
          const mine = !!profile && c.user_id === profile.user_id
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
                  mine ? 'border border-green/20 bg-green/5' : 'bg-bg/60'
                }`}
              >
                <div className="flex items-center gap-2 text-[12px] font-bold">
                  {mine ? <span className="text-green">You</span> : name}
                  <span className="text-[10px] font-medium text-muted">
                    {c.created_at ? relativeTime(c.created_at) : c.time}
                  </span>
                  {loggedIn && !mine && (
                    <button
                      onClick={() => setReportTarget(c.id)}
                      className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-red/10 hover:text-red"
                      aria-label="Report comment"
                      title="Report this comment"
                    >
                      <Flag size={11} />
                    </button>
                  )}
                  {mine &&
                    (confirmDel === c.id ? (
                      <button
                        onClick={() => void doDelete(c.id)}
                        className="ml-auto flex items-center gap-1 rounded-full bg-red px-2 py-0.5 text-[10px] font-bold text-white"
                      >
                        <Trash2 size={11} /> Confirm?
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmDel(c.id)
                          window.setTimeout(() => setConfirmDel((cur) => (cur === c.id ? null : cur)), 4000)
                        }}
                        className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-red/10 hover:text-red"
                        aria-label="Delete comment"
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

      {/* input */}
      {loggedIn ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') post()
            }}
            placeholder={`Comment as @${profile?.username ?? 'anonymous'}…`}
            className="flex-1 rounded-2xl border border-line bg-bg/60 px-4 py-3 text-[13px] text-ink outline-none placeholder:text-muted/50 focus:border-green/50"
          />
          <button
            onClick={post}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green text-bg transition-transform active:scale-95"
            aria-label="Post comment"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-line bg-bg/60 px-4 py-3">
          <p className="text-[12px] text-muted">Sign in to join the conversation.</p>
          <Link
            to="/login"
            className="shrink-0 rounded-full bg-green px-4 py-2 text-[12px] font-bold text-bg"
          >
            Sign in
          </Link>
        </div>
      )}

      <ReportDialog
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="comment"
        targetId={reportTarget ?? ''}
        onReport={reportContent}
      />
    </BottomSheet>
  )
}
