import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Check,
  Clock,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { Card, StatCard } from '../../components/charts'
import { getDeptById } from '../../lib/departments'
import { useApp } from '../../lib/store'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type Tab = 'orgs' | 'citizens' | 'comments'

export default function Admin() {
  const { pendingOrgs, loadPendingOrgs, approveOrg, org, issues, comments, deleteComment, adminUsers, loadAdminUsers, removeUser } = useApp()
  const [tab, setTab] = useState<Tab>('orgs')
  const [search, setSearch] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  useEffect(() => {
    void loadPendingOrgs()
  }, [loadPendingOrgs])

  // Re-run the citizen directory whenever the tab opens or the search changes.
  useEffect(() => {
    if (tab !== 'citizens') return
    const t = window.setTimeout(() => void loadAdminUsers(search.trim()), 200)
    return () => window.clearTimeout(t)
  }, [tab, search, loadAdminUsers])

  const pending = pendingOrgs.filter((o) => o.status === 'pending').length
  const approved = pendingOrgs.filter((o) => o.status === 'approved').length
  const visible = pendingOrgs.filter((o) => o.status !== 'rejected')

  // Flatten all comments (newest first) with their issue title for moderation.
  // The store loads every comment row, so nothing is missed even when the
  // comment's issue fell off the 100-item feed.
  const allComments = useMemo(() => {
    const titleById = new Map(issues.map((i) => [i.id, i.title]))
    const flat: { id: string; issue_id: string; issueTitle: string; username: string | null; text: string; created_at?: string }[] = []
    for (const [issueId, list] of Object.entries(comments)) {
      for (const c of list) {
        flat.push({
          id: c.id,
          issue_id: c.issue_id,
          issueTitle: titleById.get(issueId) ?? 'Issue ' + issueId.slice(0, 8),
          username: c.username ?? c.name ?? 'Citizen',
          text: c.text,
          created_at: c.created_at ?? c.time,
        })
      }
    }
    return flat.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  }, [issues, comments])

  const armDelete = (key: string) => {
    if (confirmDel === key) {
      setConfirmDel(null)
      return
    }
    setConfirmDel(key)
    window.setTimeout(() => setConfirmDel((cur) => (cur === key ? null : cur)), 4000)
  }

  const removeComment = async (issueId: string, commentId: string) => {
    setConfirmDel(null)
    const err = await deleteComment(issueId, commentId)
    if (err) console.warn('delete comment failed:', err)
  }

  const removeCitizen = async (userId: string) => {
    setConfirmDel(null)
    const err = await removeUser(userId)
    if (err) console.warn('remove user failed:', err)
  }

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'orgs', label: `Organizations · ${pending} pending`, icon: Building2 },
    { id: 'citizens', label: 'Citizens', icon: Users },
    { id: 'comments', label: `Comments · ${allComments.length}`, icon: MessageSquare },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Admin panel</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Approve organizations, moderate citizen content and manage accounts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={pending} sub="awaiting decision" color="text-orange" icon={<Clock size={16} />} accent="bg-orange/15 text-orange" />
        <StatCard label="Approved" value={approved} sub="can sign in" color="text-green" icon={<BadgeCheck size={16} />} />
        <StatCard label="Citizens" value={adminUsers.length || '—'} sub="matched accounts" color="text-blue" icon={<Users size={16} />} accent="bg-blue/15 text-blue" />
        <StatCard label="Signed in as" value={org?.org_name.split(' ')[0] ?? '—'} sub="admin role" color="text-purple" icon={<ShieldCheck size={16} />} accent="bg-purple/15 text-purple" />
      </div>

      {/* tabs */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition-all ${
              tab === t.id ? 'bg-green text-bg' : 'bg-surface text-muted hover:text-ink'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ---- Organizations ---- */}
      {tab === 'orgs' && (
        <Card
          title="Organization registrations"
          action={<span className="rounded-full bg-orange/15 px-2.5 py-1 text-[11px] font-bold text-orange">{pending} pending</span>}
        >
          <div className="space-y-2">
            {visible.length === 0 && (
              <p className="py-8 text-center text-[12.5px] text-muted">No registrations yet — new orgs appear here. 🎉</p>
            )}
            {visible.map((o) => {
              const dept = getDeptById(o.department)
              const isPending = o.status === 'pending'
              return (
                <div
                  key={o.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${
                    o.status === 'approved' ? 'border-green/40 bg-green/5' : 'border-line bg-bg/50'
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2">
                    <Building2 size={18} className="text-muted" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{o.org_name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {dept?.icon} {dept?.name ?? o.department} · {o.email}
                      {o.contact && ` · ${o.contact}`} · registered {timeAgo(o.created_at)}
                    </p>
                  </div>
                  {o.status === 'approved' && (
                    <span className="flex items-center gap-1 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-bold text-green">
                      <BadgeCheck size={12} /> Approved
                    </span>
                  )}
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => void approveOrg(o.id, 'approved')}
                        className="flex items-center gap-1 rounded-xl bg-green px-3 py-2 text-[12px] font-bold text-bg transition-transform active:scale-95"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => void approveOrg(o.id, 'rejected')}
                        className="flex items-center gap-1 rounded-xl border border-line bg-surface2 px-3 py-2 text-[12px] font-bold text-muted transition-transform active:scale-95 hover:text-red"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ---- Citizens ---- */}
      {tab === 'citizens' && (
        <Card
          title="Citizen accounts"
          action={
            <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 py-1.5">
              <Search size={13} className="text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search username or email…"
                className="w-40 bg-transparent text-[11px] font-semibold text-ink outline-none placeholder:text-muted/60"
              />
            </div>
          }
        >
          <div className="space-y-2">
            {adminUsers.length === 0 && (
              <p className="py-8 text-center text-[12.5px] text-muted">
                {search.trim() ? `No citizens match “${search.trim()}”.` : 'No citizen accounts yet — new sign-ups appear here.'}
              </p>
            )}
            {adminUsers.map((u) => (
              <div key={u.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg/50 p-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #2979FF, #2979FF77)' }}
                >
                  {(u.username ?? '?')[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-bold">{u.username ?? 'Unnamed citizen'}</p>
                    <span className="rounded-full bg-surface2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                      {u.home_area ?? 'No area'}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted">
                    {u.email ?? 'no email'} · joined {timeAgo(u.created_at)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-faint">
                    📝 {u.issues_count} reports · 💬 {u.comments_count} comments
                  </p>
                </div>
                {confirmDel === u.user_id ? (
                  <button
                    onClick={() => void removeCitizen(u.user_id)}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-red px-3 py-2 text-[12px] font-bold text-white transition-transform active:scale-95"
                  >
                    <Trash2 size={14} /> Confirm remove?
                  </button>
                ) : (
                  <button
                    onClick={() => armDelete(u.user_id)}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-red/20 bg-red/5 px-3 py-2 text-[12px] font-bold text-red transition-colors hover:bg-red/10"
                  >
                    <UserX size={14} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---- Comments ---- */}
      {tab === 'comments' && (
        <Card
          title="Citizen comments"
          action={<span className="rounded-full bg-surface2 px-2.5 py-1 text-[11px] font-bold text-muted">newest first</span>}
        >
          <div className="space-y-2">
            {allComments.length === 0 && (
              <p className="py-8 text-center text-[12.5px] text-muted">No comments yet — they appear here once citizens respond. 💬</p>
            )}
            {allComments.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg/50 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2">
                  <MessageSquare size={15} className="text-muted" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold">{c.username}</p>
                  <p className="truncate text-[11px] text-muted">
                    on “{c.issueTitle}” · {c.created_at ? timeAgo(c.created_at) : ''}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink/80">{c.text}</p>
                </div>
                {confirmDel === c.id ? (
                  <button
                    onClick={() => void removeComment(c.issue_id, c.id)}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-red px-3 py-2 text-[12px] font-bold text-white transition-transform active:scale-95"
                  >
                    <Trash2 size={14} /> Confirm?
                  </button>
                ) : (
                  <button
                    onClick={() => armDelete(c.id)}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-red/20 bg-red/5 px-3 py-2 text-[12px] font-bold text-red transition-colors hover:bg-red/10"
                    aria-label="Delete comment"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="rounded-xl border border-line bg-surface p-3.5 text-[11.5px] leading-relaxed text-muted">
        <p className="font-semibold text-ink">💡 First-time setup: create the admin account</p>
        <p className="mt-2">Do these <strong>two steps</strong> in the Supabase dashboard:</p>
        <p className="mt-2"><strong>Step 1 — Create the auth user (with a password):</strong></p>
        <p className="mt-2">
          <strong>Authentication → Users → Add user</strong>, enter <code className="text-blue">admin@civictrack.gov</code> + a strong password, and
          confirm the email. (The old SQL snippet used <code className="text-blue">supabase_functions.settings</code>, which doesn't exist on this
          project — use the dashboard instead.)
        </p>
        <p className="mt-2"><strong>Step 2 — Tag the user as an organization:</strong></p>
        <p className="mt-2">
          The dashboard doesn't let you set user metadata, and the portal rejects accounts without <code className="text-blue">role: org</code> — run this
          in the SQL editor:
        </p>
        <code className="mt-1 block rounded-lg bg-ink/[0.04] p-2.5 font-mono text-[10px] leading-relaxed text-blue">
          update auth.users
          <br />set raw_user_meta_data = jsonb_build_object('role', 'org')
          <br />where email = 'admin@civictrack.gov';
        </code>
        <p className="mt-2"><strong>Step 3 — Create the org row:</strong></p>
        <code className="mt-1 block rounded-lg bg-ink/[0.04] p-2.5 font-mono text-[10px] leading-relaxed text-blue">
          insert into organizations (email, org_name, department, role, status)
          <br />values ('admin@civictrack.gov', 'CivicTrack Admin', 'admin', 'admin', 'approved');
        </code>
        <p className="mt-2">Then sign in at <strong>/gov</strong> with <code className="text-blue">admin@civictrack.gov</code> / the password you set.</p>
      </div>
    </div>
  )
}
