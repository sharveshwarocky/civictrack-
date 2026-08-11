import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Globe,
  HelpCircle,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Shield,
  Smartphone,
  Sun,
} from 'lucide-react'
import { useApp, type ThemePref } from '../lib/store'
import { isLive } from '../lib/supabase'

const THEMES: { key: ThemePref; label: string; icon: typeof Moon }[] = [
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'system', label: 'System', icon: Smartphone },
]

const FAQS = [
  {
    q: 'How are issues verified?',
    a: 'Every report is cross-checked by the concerned department against the location and category before it is marked "under review". Official agencies then post updates that appear directly on the report.',
  },
  {
    q: 'How do I report an issue?',
    a: 'Tap the + button, add a photo, auto-detect your location, pick a category, and write a short description. Your report is instantly shared with your neighborhood feed and the relevant department.',
  },
  {
    q: 'What is an SLA?',
    a: 'Service Level Agreement — the target time each department has to respond to a report. You can see the live SLA status (on-track, warning, overdue) on every report card.',
  },
  {
    q: 'How is the budget tracked?',
    a: 'Sanctioned and spent amounts for public projects are published on each report, with an animated utilisation bar. This is what makes the platform accountable.',
  },
  {
    q: 'Who can post official updates?',
    a: 'Only verified government accounts. Citizen comments appear on reports, while official updates are clearly marked with a blue verified badge.',
  },
]

export default function Settings() {
  const { settings, setSetting, user, profile, logout } = useApp()
  const navigate = useNavigate()
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  const notifs = [
    { key: 'notifPush' as const, label: 'Push notifications', sub: 'Support, replies & status changes', icon: Smartphone },
    { key: 'notifEmail' as const, label: 'Email alerts', sub: 'Budget changes & account activity', icon: Mail },
    { key: 'notifBudget' as const, label: 'Budget alerts', sub: 'Notify me when budgets are revised', icon: Bell },
    { key: 'digest' as const, label: 'Weekly digest', sub: 'A Monday summary in your Notifications — new issues, updates & resolutions in your area', icon: CalendarDays },
  ]

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-bg pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 px-4 py-4 backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Settings</p>
        <h1 className="mt-0.5 text-[20px] font-bold tracking-tight">Preferences</h1>
      </header>

      <div className="space-y-5 px-4 pt-4">
        <section>
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <Moon size={14} className="text-muted" /> Appearance
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSetting('theme', t.key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3.5 transition-all btn-press ${
                  settings.theme === t.key
                    ? 'border-green bg-green/10 text-green'
                    : 'border-line bg-surface text-muted hover:border-line-light'
                }`}
              >
                <t.icon size={18} />
                <span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-faint">
            {settings.theme === 'system'
              ? 'Following your device appearance.'
              : settings.theme === 'light'
                ? 'Light theme enabled.'
                : 'Dark theme enabled.'}
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <Bell size={14} className="text-muted" /> Notifications
          </h2>
          <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {notifs.map((n) => (
              <button
                key={n.key}
                onClick={() => setSetting(n.key, !settings[n.key])}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ink/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-muted">
                  <n.icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{n.label}</span>
                  <span className="block text-[11px] text-faint">{n.sub}</span>
                </span>
                <span
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                    settings[n.key] ? 'bg-green' : 'bg-ink/[0.08]'
                  }`}
                  aria-hidden="true"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      settings[n.key] ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <Shield size={14} className="text-muted" /> Account
          </h2>
          <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-center gap-3 px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-muted">
                <Mail size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Anonymous username</span>
                <span className="block truncate text-[11px] text-faint">@{profile?.username ?? 'Not set'} · {user?.email ?? 'Not signed in'}</span>
              </span>
            </div>
            <button
              onClick={() => navigate('/onboarding?edit=1')}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ink/5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-muted">
                <MapPin size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Edit profile</span>
                <span className="block truncate text-[11px] text-faint">
                  @{profile?.username ?? 'Not set'} · home area: {profile?.home_area ?? 'Not set'}
                </span>
              </span>
              <ChevronRight size={15} className="text-faint" />
            </button>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-muted">
                <Globe size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Data source</span>
                <span className="block text-[11px] text-faint">
                  {isLive ? 'Live · Synced with Supabase' : 'Demo · Local only — connect Supabase'}
                </span>
              </span>
            </div>
            <button className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ink/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-muted">
                <Shield size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Privacy</span>
                <span className="block text-[11px] text-faint">Manage your data &amp; permissions</span>
              </span>
              <ChevronRight size={15} className="text-faint" />
            </button>
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <HelpCircle size={14} className="text-muted" /> Help &amp; support
          </h2>
          <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ink/5"
                >
                  <span className="flex-1 text-[13px] font-semibold">{f.q}</span>
                  <ChevronDown
                    size={15}
                    className={`shrink-0 text-faint transition-transform ${faqOpen === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {faqOpen === i && (
                  <p className="anim-fade px-3.5 pb-3 text-[12px] leading-relaxed text-muted">{f.a}</p>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              window.location.href = 'tel:04425384400'
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-blue/30"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
              <Phone size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">Contact ward office</span>
              <span className="block text-[11px] text-faint">044 2538 4400 · Mon–Sat, 10 AM – 6 PM</span>
            </span>
            <ChevronRight size={15} className="text-faint" />
          </button>
        </section>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red/20 bg-red/5 py-3.5 text-[13px] font-semibold text-red transition-all btn-press hover:bg-red/10"
        >
          <LogOut size={16} /> Log out
        </button>

        <p className="pb-4 text-center text-[10px] leading-relaxed text-faint">
          CivicTrack v0.1 · Made for accountable neighborhoods
        </p>
      </div>
    </div>
  )
}
