import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, HelpCircle, Lock, LogOut, MapPin, Moon, Plus, Settings, Shield } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { CoverImage } from '../components/CoverImage'
import { ScreenHeader } from '../components/ScreenHeader'
import { StatusChip } from '../components/StatusChip'
import { useApp } from '../lib/store'

interface Achievement {
  emoji: string
  label: string
  earned: boolean
  desc: string
}

export default function Profile() {
  const { issues, profile, user, logout } = useApp()
  const navigate = useNavigate()

  const mine = profile ? issues.filter((i) => i.user_id === profile.user_id) : []
  const resolved = mine.filter((i) => i.status === 'completed').length
  const totalUpvotes = mine.reduce((s, i) => s + i.upvotes, 0)
  const categories = new Set(mine.map((i) => i.category))
  const displayName = profile?.username ?? 'Citizen'
  const displayCity = profile?.home_area ?? '—'
  const avatarColor = profile?.avatar_color ?? '#00C853'

  const achievements: Achievement[] = [
    { emoji: '📝', label: 'First Report', earned: mine.length >= 1, desc: 'File your first report' },
    { emoji: '🛣️', label: 'Road Warrior', earned: categories.has('Road'), desc: 'Report a road issue' },
    { emoji: '💧', label: 'Water Watch', earned: categories.has('Water'), desc: 'Report a water issue' },
    { emoji: '🗑️', label: 'Clean City', earned: categories.has('Garbage'), desc: 'Report a garbage issue' },
    { emoji: '💡', label: 'Bright Spark', earned: categories.has('Electricity'), desc: 'Report an electricity issue' },
    { emoji: '🌊', label: 'Drain Master', earned: categories.has('Drainage'), desc: 'Report a drainage issue' },
    { emoji: '🔥', label: 'Trending', earned: totalUpvotes >= 500, desc: `${totalUpvotes} supports earned` },
    { emoji: '✅', label: 'Problem Solver', earned: resolved >= 1, desc: 'Get a report resolved' },
  ]
  const earnedCount = achievements.filter((a) => a.earned).length

  const settings = [
    { icon: Moon, label: 'Appearance', sub: 'Dark, Light or System', to: '/app/settings' },
    { icon: Bell, label: 'Notifications', sub: 'Push, email, budget alerts', to: '/app/settings' },
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

        {/* achievements */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Achievements</h2>
            <span className="text-[11px] font-semibold text-green">{earnedCount} / {achievements.length} earned</span>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {achievements.map((a) => (
              <div
                key={a.label}
                title={a.earned ? a.desc : `Locked — ${a.desc}`}
                className={`relative flex flex-col items-center rounded-2xl border px-2 py-3 transition-colors ${
                  a.earned ? 'border-green/25 bg-green/5' : 'border-line bg-surface'
                }`}
              >
                <span className={`text-2xl ${a.earned ? '' : 'opacity-30 grayscale'}`}>{a.emoji}</span>
                <span className={`mt-1.5 text-center text-[10px] font-semibold leading-tight ${a.earned ? 'text-ink' : 'text-muted'}`}>
                  {a.label}
                </span>
                {!a.earned && (
                  <span className="absolute right-1.5 top-1.5 text-faint">
                    <Lock size={10} />
                  </span>
                )}
              </div>
            ))}
          </div>
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
    </div>
  )
}
