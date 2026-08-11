import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronDown, ExternalLink, MessageSquare, Send, ThumbsUp, Timer, Trash2 } from 'lucide-react'
import { StatusChip } from '../../components/StatusChip'
import { compact, formatINR, relativeTime, slaInfo } from '../../lib/format'
import { CATEGORY_META } from '../../lib/constants'
import { getDeptById } from '../../lib/departments'
import { defaultTimeline, timelineForStatus } from '../../lib/timeline'
import { useApp } from '../../lib/store'
import type { Issue, Status, TimelineStep } from '../../lib/types'

type Filter = 'all' | 'open' | 'overdue' | 'completed'

/** The status implied when each timeline step is turned on. */
const STEP_STATUS: Partial<Record<string, Status>> = {
  Inspected: 'under_review',
  Funded: 'in_progress',
  'In Progress': 'in_progress',
  Completed: 'completed',
}

interface Draft {
  text: string
  progress: number
  progressTouched: boolean
  budget: string
  spent: string
  status: Status | ''
  afterPhoto: string | null
  contractor: string
  timeline: TimelineStep[]
  timelineTouched: boolean
  busy: boolean
  error: string
}

const EMPTY: Draft = {
  text: '',
  progress: 0,
  progressTouched: false,
  budget: '',
  spent: '',
  status: '',
  afterPhoto: null,
  contractor: '',
  timeline: defaultTimeline(),
  timelineTouched: false,
  busy: false,
  error: '',
}

export default function DeptIssues() {
  const { issues, org, postOfficialUpdate, deleteIssue } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileFor = useRef<string | null>(null)

  if (!org) return null
  const deptInfo = getDeptById(org.department)

  // Admin sees EVERY issue and can work on any of them; a regular org only
  // sees issues in its own department's categories (department → category map).
  const deptIssues =
    org.role === 'admin'
      ? issues
      : deptInfo
        ? issues.filter((i) => deptInfo.categories.includes(i.category))
        : issues
  const filtered = deptIssues.filter((i) => {
    if (filter === 'open') return i.status !== 'completed'
    if (filter === 'overdue') return i.status === 'overdue'
    if (filter === 'completed') return i.status === 'completed'
    return true
  })

  const patch = (id: string, p: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...p } }))

  const toggleOpen = (id: string, completionPct?: number, issue?: Issue) => {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setDrafts((prev) => ({
      ...prev,
      [id]: prev[id] ?? {
        ...EMPTY,
        progress: completionPct ?? 0,
        contractor: issue?.contractor ?? '',
        timeline: issue?.timeline?.length ? issue.timeline : defaultTimeline(),
      },
    }))
    setOpenId(id)
  }

  const toggleStep = (id: string, label: string) => {
    const d = drafts[id] ?? EMPTY
    // 'Reported' is the origin — always done, never toggleable.
    if (label === 'Reported') return
    const turningOn = !d.timeline.find((s) => s.label === label)?.done
    const timeline = d.timeline.map((s) =>
      s.label === label ? { ...s, done: turningOn, date: turningOn ? 'Today' : '—' } : s,
    )
    // Turning a step ON also advances the status chip so they stay in sync.
    const implied = turningOn ? STEP_STATUS[label] : undefined
    const extra: Partial<Draft> = implied ? { status: implied } : {}
    // If Completed is turned back off, revert to in-progress rather than lying.
    if (label === 'Completed' && !turningOn && d.status === 'completed') extra.status = 'in_progress'
    patch(id, { timeline, timelineTouched: true, ...extra })
  }

  const pickAfter = (f: File | undefined) => {
    if (!f || !fileFor.current) return
    const reader = new FileReader()
    reader.onload = () => patch(fileFor.current!, { afterPhoto: String(reader.result) })
    reader.readAsDataURL(f)
  }

  const armDelete = (id: string) => {
    if (confirmDel === id) {
      setConfirmDel(null)
      return
    }
    setConfirmDel(id)
    window.setTimeout(() => setConfirmDel((cur) => (cur === id ? null : cur)), 4000)
  }

  const removeIssue = async (id: string) => {
    setConfirmDel(null)
    const err = await deleteIssue(id)
    if (err) {
      console.warn('delete issue failed:', err)
      return
    }
    if (openId === id) setOpenId(null)
  }

  const post = async (issue: Issue) => {
    const d = drafts[issue.id] ?? EMPTY
    if (!d.text.trim() && !d.status && d.budget === '' && d.spent === '' && !d.afterPhoto) return
    patch(issue.id, { busy: true, error: '' })
    const err = await postOfficialUpdate(issue.id, {
      text: d.text.trim() || 'Status update posted.',
      ...(d.progressTouched ? { progress: d.progress } : {}),
      ...(d.budget !== '' ? { budget: Number(d.budget) } : {}),
      ...(d.spent !== '' ? { spent: Number(d.spent) } : {}),
      ...(d.status ? { status: d.status } : {}),
      ...(d.afterPhoto ? { afterPhoto: d.afterPhoto } : {}),
      ...(d.contractor.trim() && d.contractor.trim() !== (issue.contractor ?? '') ? { contractor: d.contractor.trim() } : {}),
      ...(d.timelineTouched ? { timeline: d.timeline } : {}),
      orgName: org.org_name,
    })
    if (err) {
      patch(issue.id, { busy: false, error: err })
      return
    }
    setDrafts((prev) => ({ ...prev, [issue.id]: EMPTY }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight">Issues &amp; work</h1>
          <p className="mt-0.5 text-[11px] text-muted">
            {filtered.length} of {deptIssues.length} issues
            {org.role === 'admin' ? ' · admin — all departments visible' : ' · post updates, budgets and completion proof'}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['all', 'open', 'overdue', 'completed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                filter === f ? 'bg-ink/[0.06] text-ink' : 'text-muted hover:text-soft'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickAfter(e.target.files?.[0])}
      />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <p className="text-[12px] text-muted">No issues in this filter.</p>
          </div>
        )}
        {filtered.map((i) => {
          const open = openId === i.id
          const sla = slaInfo(i)
          const d = drafts[i.id] ?? EMPTY
          return (
            <div key={i.id} className="rounded-xl border border-line bg-surface p-3.5 transition-all">
              <button onClick={() => toggleOpen(i.id, i.completionPct, i)} className="flex w-full items-start gap-2.5 text-left">
                <span className="mt-0.5 text-lg">{CATEGORY_META[i.category]?.emoji ?? '📍'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-[13px] font-semibold">{i.title}</h3>
                    <StatusChip status={i.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {i.area} · {i.category} · {relativeTime(i.createdAt)}
                    {sla && (
                      <span className={sla.tone === 'overdue' ? 'font-semibold text-red' : sla.tone === 'warn' ? 'text-orange' : ''}>
                        {' '}· {sla.text}
                      </span>
                    )}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted">
                    <span className="flex items-center gap-1"><ThumbsUp size={10} /> {compact(i.upvotes)}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={10} /> {i.comments}</span>
                    <span className="font-semibold text-purple">{formatINR(i.budget)}</span>
                    <span className="flex items-center gap-1"><Timer size={10} /> {i.days}d</span>
                  </div>
                </div>
                <ChevronDown size={15} className={`mt-1 shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="mt-3 space-y-3 border-t border-line/50 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/issue/${i.id}`)}
                      className="flex items-center gap-1 rounded-lg border border-line bg-ink/[0.02] px-2.5 py-1.5 text-[10px] font-semibold transition-colors nav-hover hover:border-blue/30"
                    >
                      <ExternalLink size={10} /> View public report
                    </button>
                    {org.role === 'admin' &&
                      (confirmDel === i.id ? (
                        <button
                          onClick={() => void removeIssue(i.id)}
                          className="flex items-center gap-1 rounded-lg bg-red px-2.5 py-1.5 text-[10px] font-bold text-white transition-transform active:scale-95"
                        >
                          <Trash2 size={10} /> Confirm delete?
                        </button>
                      ) : (
                        <button
                          onClick={() => armDelete(i.id)}
                          className="flex items-center gap-1 rounded-lg border border-red/20 bg-red/5 px-2.5 py-1.5 text-[10px] font-semibold text-red transition-colors hover:bg-red/10"
                        >
                          <Trash2 size={10} /> Delete report
                        </button>
                      ))}
                    {i.official && (
                      <span className="text-[10px] text-muted">Last update: {relativeTime(i.official.postedAt)}</span>
                    )}
                  </div>

                  {/* official update text */}
                  <textarea
                    value={d.text}
                    onChange={(e) => patch(i.id, { text: e.target.value })}
                    rows={2}
                    placeholder="Write a public update for citizens…"
                    className="w-full resize-none rounded-lg border border-line bg-ink/[0.02] px-3 py-2.5 text-[12px] leading-relaxed text-ink outline-none placeholder:text-faint transition-colors focus:border-blue/30"
                  />

                  {/* progress */}
                  <div>
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-muted">
                      <span>Progress</span>
                      <span className="text-green">{d.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={d.progress}
                      onChange={(e) => patch(i.id, { progress: Number(e.target.value), progressTouched: true })}
                      className="mt-1.5 w-full accent-[#2ECC71]"
                    />
                  </div>

                  {/* contractor */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Contractor (optional)</label>
                    <input
                      value={d.contractor}
                      onChange={(e) => patch(i.id, { contractor: e.target.value })}
                      placeholder={i.contractor ?? 'Contractor name — e.g. L&T'}
                      className="mt-1 w-full rounded-lg border border-line bg-ink/[0.02] px-3 py-2 text-[12px] font-semibold text-ink outline-none placeholder:text-faint focus:border-blue/30"
                    />
                  </div>

                  {/* budget + spent */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Sanctioned budget (₹)</label>
                      <input
                        value={d.budget}
                        onChange={(e) => patch(i.id, { budget: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder={i.budget > 0 ? String(i.budget) : 'Enter amount'}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-line bg-ink/[0.02] px-3 py-2 text-[12px] font-semibold text-ink outline-none placeholder:text-faint focus:border-blue/30"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Spent so far (₹)</label>
                      <input
                        value={d.spent}
                        onChange={(e) => patch(i.id, { spent: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder={i.spent > 0 ? String(i.spent) : 'Enter amount'}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-line bg-ink/[0.02] px-3 py-2 text-[12px] font-semibold text-ink outline-none placeholder:text-faint focus:border-blue/30"
                      />
                    </div>
                  </div>

                  {/* status — overdue is now automatic via SLA (Phase 2 cron), so no manual toggle */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Change status</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(['under_review', 'in_progress', 'completed'] as Status[]).map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            patch(i.id, {
                              status: d.status === s ? '' : s,
                              // Keep the work timeline in sync with the chosen status.
                              timeline: s !== d.status ? timelineForStatus(s, d.timeline) : d.timeline,
                              timelineTouched: s !== d.status ? true : d.timelineTouched,
                            })
                          }
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            d.status === s ? 'border-green/40 bg-green/10 text-green' : 'border-line bg-ink/[0.02] text-muted'
                          }`}
                        >
                          {s === 'under_review' ? 'Under review' : s === 'in_progress' ? 'In progress' : 'Mark complete ✓'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* work timeline */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Work timeline</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.timeline.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => toggleStep(i.id, s.label)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            s.done ? 'border-green/40 bg-green/10 text-green' : 'border-line bg-ink/[0.02] text-muted'
                          }`}
                        >
                          {s.done ? '✓ ' : ''}
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* after photo (completion proof) */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Completion photo (before → after)</label>
                    {d.afterPhoto ? (
                      <div className="relative mt-1.5 overflow-hidden rounded-lg border border-green/30">
                        <img src={d.afterPhoto} alt="Completion proof" className="h-32 w-full object-cover" />
                        <button
                          onClick={() => patch(i.id, { afterPhoto: null })}
                          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md"
                        >
                          Remove
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-green backdrop-blur-md">
                          ✓ After photo ready
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          fileFor.current = i.id
                          fileRef.current?.click()
                        }}
                        className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-ink/[0.02] py-3 text-[11px] font-semibold text-muted transition-colors hover:border-green/40"
                      >
                        <Camera size={13} /> Upload after photo
                      </button>
                    )}
                  </div>

                  {d.error && <p className="text-[11px] font-medium text-red">{d.error}</p>}

                  <button
                    onClick={() => void post(i)}
                    disabled={d.busy}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition-all ${
                      d.busy ? 'bg-ink/[0.04] text-faint' : 'bg-blue text-white hover:brightness-110'
                    }`}
                  >
                    {d.busy ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Send size={13} /> Publish update
                        {d.status === 'completed' && <Check size={13} />}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
