import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, ChevronRight, HelpCircle, Lock, LogOut, MapPin, Moon, Plus, Settings, Shield } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { CoverImage } from '../components/CoverImage'
import { ScreenHeader } from '../components/ScreenHeader'
import { StatusChip } from '../components/StatusChip'
import { AchievementModal } from '../components/AchievementModal'
import { ACHIEVEMENTS, type Achievement } from '../lib/achievements'
import { useApp } from '../lib/store'

const VISIBLE = 12

export default function Profile() {
  const { issues, comments, profile, user, logout } = useApp()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const [openAchievement, setOpenAchievement] = useState<Achievement | null>(null)

  const mine = useMemo(() => (profile ? issues.filter((i) => i.user_id === profile.user_id) : []), [issues, profile])
  const resolved = mine.filter((i) => i.status === 'completed').length
  const totalUpvotes = mine.reduce((s, i) => s + i.upvotes, 0)
  const displayName = profile?.username ?? 'Citizen'
  const displayCity = profile?.home_area ?? '—'
  const avatarColor = profile?.avatar_color ?? '#00C853'

  // ---- live stats for achievements ----
  const stats = useMemo(() => {
    // Real comment activity — from the live comments store, filtered to this user.
    const myComments: string[] = []
    let commentsPosted = 0
    for (const list of Object.values(comments)) {
      for (const c of list) {
        if (profile && c.user_id === profile.user_id) {
          commentsPosted += 1
          if (!myComments.includes(c.issue_id)) myComments.push(c.issue_id)
        }
      }
    }
    const daysActive = profile?.created_at
      ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000))
      : 1
    // Verified = email-confirmed citizen who is active (3+ reports or 30 days).
    const verified = !!user?.email && (mine.length >= 3 || daysActive >= 30)
    return {
      issues: mine,
      resolved,
      upvotes: totalUpvotes,
      commentsPosted,
      following: 0,
      daysActive,
      verified,
      homeArea: profile?.home_area ?? null,
      commentIssueIds: myComments,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, resolved, totalUpvotes, comments, profile?.user_id, profile?.created_at, profile?.home_area, user?.email])

  const list = useMemo(
    () => ACHIEVEMENTS.map((a) => ({ a, value: a.value(stats), earned: a.earned(stats) })),
    [stats],
  )
  const earnedCount = list.filter((l) => l.earned).length
  const visible = showAll ? list : list.slice(0, VISIBLE)

  const settings = [
    { icon: Moon, label: 'Appearance', sub: 'Dark, Light or System', to: '/app/settings' },
    { icon: Bell, label: 'Notifications', sub: 'Push, email, weekly digest', to: '/app/settings' },
    { icon: Shield, label: 'Privacy & settings', sub: 'Account & data', to: '/app/settings' },
    { icon: HelpCircle, label: 'Help & support', sub: 'FAQ, contact ward office', to: '/app/settings' },
  ]

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <ScreenHeader title="Profile" right={
        <button onClick={() => navigate('/app/settings')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink" aria-label="Settings">
          <Settings size={17} />
        </button>
      } />
      <div className="px-4 pt-4">
        {/* identity card */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3.5">
            <Avatar color={avatarColor} name={displayName} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-lg font-extrabold">
                {displayName}
                <span className="rounded-full bg-green/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green">
                  Anonymous
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                <MapPin size={12} /> {displayCity}
              </div>
              <p className="mt-1 truncate text-[12px] text-muted">
                {user?.email ?? 'Reporting civic issues anonymously'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-surface2 text-center">
            <div className="py-3">
              <p className="text-lg font-extrabold">{mine.length}</p>
              <p className="text-[10px] font-semibold uppercase text-muted">Reports</p>
            </div>
            <div className="py-3">
              <p className="text-lg font-extrabold">{totalUpvotes}</p>
              <p className="text-[10px] font-semibold uppercase text-muted">Supports</p>
            </div>
            <div className="py-3">
              <p className="text-lg font-extrabold">{resolved}</p>
              <p className="text-[10px] font-semibold uppercase text-muted">Resolved</p>
            </div>
          </div>
        </div>

        {/* achievements — 51 live-computed, show more, tap for details */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Achievements</h2>
            <span className="text-[11px] font-semibold text-green">{earnedCount} / {list.length} earned</span>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {visible.map(({ a, value, earned }) => (
              <button
                key={a.id}
                onClick={() => setOpenAchievement(a)}
                title={`${a.label} — ${a.desc}`}
                className={`relative flex flex-col items-center rounded-2xl border px-2 py-3 transition-all active:scale-95 ${
                  earned ? 'border-green/25 bg-green/5' : 'border-line bg-surface hover:border-line-light'
                }`}
              >
                <span className={`text-2xl transition-opacity ${earned ? '' : 'opacity-30 grayscale'}`}>{a.emoji}</span>
                <span className={`mt-1.5 text-center text-[10px] font-semibold leading-tight ${earned ? 'text-ink' : 'text-muted'}`}>
                  {a.label}
                </span>
                {a.max > 0 && (
                  <span className={`mt-1 h-1 w-9 overflow-hidden rounded-full ${earned ? 'bg-green/20' : 'bg-ink/[0.06]'}`}>
                    <span
                      className={`block h-full rounded-full ${earned ? 'bg-green' : 'bg-muted/40'}`}
                      style={{ width: `${Math.min(100, Math.round((value / a.max) * 100))}%` }}
                    />
                  </span>
                )}
                {!earned && (
                  <span className="absolute right-1.5 top-1.5 text-faint">
                    <Lock size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
          {list.length > VISIBLE && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-surface py-2.5 text-[12px] font-semibold text-muted transition-colors hover:text-ink"
            >
              {showAll ? 'Show less' : `Show ${list.length - VISIBLE} more achievements`}
              <ChevronDown size={13} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* my reports */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold">My reports</h2>
            <span className="text-[11px] font-semibold text-green">✓ {resolved} resolved</span>
          </div>
          {mine.length === 0 ? (
            <div className="mt-2.5 flex flex-col items-center rounded-2xl border border-line bg-surface py-10 text-center">
              <span className="text-4xl">📋</span>
              <p className="mt-3 text-[13px] font-semibold">No reports yet</p>
              <p className="mt-1 text-[12px] text-muted">Report your first civic issue to get started.</p>
              <button
                onClick={() => navigate('/app/create')}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-green px-4 py-2.5 text-[12px] font-semibold text-bg btn-press"
              >
                <Plus size={14} /> Report an issue
              </button>
            </div>
          ) : (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {mine.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate(`/issue/${i.id}`)}
                  className="overflow-hidden rounded-2xl border border-line bg-surface text-left transition-all card-hover"
                >
                  <CoverImage cover={i.cover} className="relative h-24 w-full">
                    <span className="absolute bottom-2 left-2">
                      <StatusChip status={i.status} />
                    </span>
                  </CoverImage>
                  <div className="px-2.5 pb-2.5 pt-2">
                    <p className="truncate text-[12px] font-semibold">{i.title}</p>
                    <p className="mt-1 text-[10px] text-muted">👍 {i.upvotes} · 💬 {i.comments}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* settings */}
        <div className="mt-5">
          <h2 className="text-[15px] font-bold">Settings</h2>
          <div className="mt-2.5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {settings.map((s) => (
              <button
                key={s.label}
                onClick={() => navigate(s.to)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/5"
              >
                <s.icon size={18} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{s.label}</span>
                  <span className="block text-[11px] text-muted">{s.sub}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </button>
            ))}
          </div>
        </div>

        {/* sign out */}
        <button
          onClick={signOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red/20 bg-red/5 py-3.5 text-[13px] font-semibold text-red transition-all btn-press hover:bg-red/10"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      {/* achievement detail popup */}
      {openAchievement && (
        <AchievementModal
          achievement={openAchievement}
          value={list.find((l) => l.a.id === openAchievement.id)?.value ?? 0}
          earned={list.find((l) => l.a.id === openAchievement.id)?.earned ?? false}
          onClose={() => setOpenAchievement(null)}
        />
      )}
    </div>
  )
}
