import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BadgeCheck, FileText, LayoutDashboard, LogOut, MapPin, ShieldCheck } from 'lucide-react'
import { getDeptById } from '../../lib/departments'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../lib/store'

export default function GovLayout() {
  const { org, logoutOrg } = useApp()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(() => !!org)

  // Re-validate the org session against the DB on every portal load — a stale
  // localStorage session dies the moment the org is rejected or removed.
  useEffect(() => {
    if (!org || !supabase) return // the org portal only exists with Supabase configured
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('status')
        .eq('email', org.email)
        .maybeSingle()
      if (cancelled) return
      if (!data || data.status !== 'approved') {
        logoutOrg()
        navigate('/gov', { replace: true })
        return
      }
      setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [org, logoutOrg, navigate])

  if (!org) return <Navigate to="/gov" replace />

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />
      </div>
    )
  }

  const deptInfo = getDeptById(org.department)
  const isAdmin = org.role === 'admin'

  const NAV = [
    { to: '/gov/portal/overview', icon: LayoutDashboard, label: 'Overview', sub: 'Department pulse' },
    { to: '/gov/portal/issues', icon: FileText, label: 'Issues', sub: 'Work & updates' },
    ...(isAdmin
      ? [{ to: '/gov/portal/admin', icon: ShieldCheck, label: 'Admin', sub: 'Approve organizations' }]
      : []),
  ]

  return (
    <div className="min-h-dvh bg-bg">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: deptInfo?.color ?? '#2979FF' }}
          >
            <span className="text-base">{deptInfo?.icon ?? '🏛️'}</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight">
              {org.org_name} <span className="text-blue">· Portal</span>
            </p>
            <p className="text-[10.5px] font-medium text-muted">
              {deptInfo?.name ?? org.department} {isAdmin ? '· Admin' : ''}
            </p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-1.5 text-[11px] font-bold text-green sm:flex">
            <BadgeCheck size={13} /> Approved
          </span>
          <button
            onClick={() => logoutOrg()}
            className="ml-1 flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2 text-[12px] font-bold transition-colors hover:border-red/30 hover:text-red"
          >
            <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] gap-6 px-4 py-5">
        {/* side nav (desktop) */}
        <nav className="hidden w-[210px] shrink-0 flex-col gap-1.5 lg:flex">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">Workspace</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all ${
                  isActive ? 'border-green/30 bg-green/10' : 'border-transparent hover:border-line hover:bg-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      isActive ? 'bg-green/15 text-green' : 'bg-surface text-muted group-hover:text-ink'
                    }`}
                  >
                    <item.icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[13px] font-bold ${isActive ? 'text-green' : 'text-ink'}`}>
                      {item.label}
                    </span>
                    <span className="block text-[10.5px] text-muted">{item.sub}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <div className="mt-4 rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <MapPin size={13} className="text-green" /> Live data source
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              All figures are computed live from citizen reports. Updates you post appear instantly on the citizen feed.
            </p>
          </div>
        </nav>

        {/* horizontal nav (mobile) */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition-all ${
                  isActive ? 'bg-green text-bg' : 'bg-surface text-muted'
                }`
              }
            >
              <item.icon size={14} /> {item.label}
            </NavLink>
          ))}
        </div>

        {/* content */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
