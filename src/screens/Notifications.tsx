import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCheck } from 'lucide-react'
import { ScreenHeader } from '../components/ScreenHeader'
import { NOTIF_TYPE_BG } from '../lib/constants'
import { useApp } from '../lib/store'
import type { AppNotification } from '../lib/types'

function timeLabel(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function Notifications() {
  const { notifications, markRead, unreadCount, markAllRead } = useApp()
  const navigate = useNavigate()

  const grouped = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const today: AppNotification[] = []
    const earlier: AppNotification[] = []
    const digest: AppNotification[] = []
    const day = 24 * 60 * 60000
    for (const n of sorted) {
      if (n.title === 'Your weekly civic digest') digest.push(n)
      else if (Date.now() - new Date(n.created_at).getTime() < day) today.push(n)
      else earlier.push(n)
    }
    return { today, earlier, digest: digest[0] ?? null, digestCount: digest.length }
  }, [notifications])

  const open = (n: AppNotification) => {
    markRead(n.id)
    // Deep-link straight to the report the notification refers to.
    if (n.issue_id) {
      navigate(`/issue/${n.issue_id}`)
      return
    }
    navigate(n.type === 'update' || n.type === 'resolved' || n.type === 'budget' ? '/app/updates' : '/app/home')
  }

  const renderRow = (n: AppNotification) => {
    const seen = n.read
    return (
      <button
        key={n.id}
        onClick={() => open(n)}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/5 ${
          seen ? 'opacity-70' : ''
        }`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${NOTIF_TYPE_BG[n.type] ?? 'bg-blue/15'}`}>
          {n.icon ?? '🔔'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="truncate">{n.title}</span>
            {!seen && <span className="h-2 w-2 shrink-0 rounded-full bg-green" />}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted">{n.body}</span>
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
            {timeLabel(n.created_at)}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      <ScreenHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <button onClick={markAllRead} className="flex items-center gap-1 text-[12px] font-bold text-green">
              <CheckCheck size={15} /> Mark all read
            </button>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center px-6 pt-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/[0.03] text-3xl">🔕</span>
          <p className="mt-5 text-[14px] font-semibold">No notifications yet</p>
          <p className="mt-1 text-[12px] text-muted">
            You'll be notified when officials update or resolve issues you follow.
          </p>
        </div>
      ) : (
        <>
          {/* weekly digest card — the Monday summary lives here, not in email */}
          {grouped.digest && (
            <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-green/25 bg-gradient-to-br from-green/10 to-transparent">
              <button
                onClick={() => markRead(grouped.digest!.id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-green/5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green/15 text-green">
                  <CalendarDays size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13.5px] font-bold">
                    <span className="truncate">{grouped.digest.title}</span>
                    {!grouped.digest.read && <span className="h-2 w-2 shrink-0 rounded-full bg-green" />}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{grouped.digest.body}</span>
                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
                    {timeLabel(grouped.digest.created_at)} · tap to read
                  </span>
                </span>
              </button>
              {grouped.digestCount > 1 && (
                <p className="border-t border-green/10 px-4 py-2 text-[10px] text-muted">
                  {grouped.digestCount - 1} older digest{grouped.digestCount > 2 ? 's' : ''} in Earlier
                </p>
              )}
            </div>
          )}

          {grouped.today.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted">Today</p>
              <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {grouped.today.map(renderRow)}
              </div>
            </>
          )}
          {grouped.earlier.length > 0 && (
            <div className="mt-5">
              <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted">Earlier</p>
              <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {grouped.earlier.map(renderRow)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
