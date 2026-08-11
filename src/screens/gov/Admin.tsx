import { useEffect } from 'react'
import { BadgeCheck, Building2, Check, Clock, ShieldCheck, X } from 'lucide-react'
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

export default function Admin() {
  const { pendingOrgs, loadPendingOrgs, approveOrg, org } = useApp()

  useEffect(() => {
    void loadPendingOrgs()
  }, [loadPendingOrgs])

  const pending = pendingOrgs.filter((o) => o.status === 'pending').length
  const approved = pendingOrgs.filter((o) => o.status === 'approved').length
  const rejected = pendingOrgs.filter((o) => o.status === 'rejected').length
  const visible = pendingOrgs.filter((o) => o.status !== 'rejected')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Admin panel</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Approve or reject organization registrations. Only approved orgs can access the portal.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={pending} sub="awaiting decision" color="text-orange" icon={<Clock size={16} />} accent="bg-orange/15 text-orange" />
        <StatCard label="Approved" value={approved} sub="can sign in" color="text-green" icon={<BadgeCheck size={16} />} />
        <StatCard label="Rejected" value={rejected} sub="blocked accounts" color="text-red" icon={<X size={16} />} accent="bg-red/15 text-red" />
        <StatCard label="Signed in as" value={org?.org_name.split(' ')[0] ?? '—'} sub="admin role" color="text-blue" icon={<ShieldCheck size={16} />} accent="bg-blue/15 text-blue" />
      </div>

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

      <div className="rounded-xl border border-line bg-surface p-3.5 text-[11.5px] leading-relaxed text-muted">
        <p className="font-semibold text-ink">💡 First-time setup: create the admin account</p>
        <p className="mt-2">Run these <strong>two steps</strong> in the Supabase SQL editor:</p>
        <p className="mt-2"><strong>Step 1 — Create the auth user (with a password):</strong></p>
        <code className="mt-1 block rounded-lg bg-ink/[0.04] p-2.5 font-mono text-[10px] leading-relaxed text-blue">
          select net.http_post(
          <br />&nbsp;&nbsp;url := (select url || '/auth/v1/admin/users' from supabase_functions.settings),
          <br />&nbsp;&nbsp;headers := jsonb_build_object(
          <br />&nbsp;&nbsp;&nbsp;&nbsp;'apikey', (select key from supabase_functions.settings),
          <br />&nbsp;&nbsp;&nbsp;&nbsp;'Authorization', 'Bearer ' || (select key from supabase_functions.settings)
          <br />&nbsp;&nbsp;),
          <br />&nbsp;&nbsp;body := jsonb_build_object(
          <br />&nbsp;&nbsp;&nbsp;&nbsp;'email', 'admin@civictrack.gov',
          <br />&nbsp;&nbsp;&nbsp;&nbsp;'password', 'admin123456',
          <br />&nbsp;&nbsp;&nbsp;&nbsp;'email_confirm', true,
          <br />&nbsp;&nbsp;&nbsp;&nbsp;'user_metadata', jsonb_build_object('role', 'org')
          <br />&nbsp;&nbsp;)
          <br />);
        </code>
        <p className="mt-2"><strong>Step 2 — Create the org row:</strong></p>
        <code className="mt-1 block rounded-lg bg-ink/[0.04] p-2.5 font-mono text-[10px] leading-relaxed text-blue">
          insert into organizations (email, org_name, department, role, status)
          <br />values ('admin@civictrack.gov', 'CivicTrack Admin', 'admin', 'admin', 'approved');
        </code>
        <p className="mt-2">Then sign in at <strong>/gov</strong> with <code className="text-blue">admin@civictrack.gov</code> / <code className="text-blue">admin123456</code>.</p>
      </div>
    </div>
  )
}
