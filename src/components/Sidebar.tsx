import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  Home,
  Map,
  MapPin,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  User,
} from 'lucide-react'
import { Avatar } from './Avatar'
import { AREAS } from '../lib/areas'
import { useApp } from '../lib/store'

const NAV = [
  { to: '/app/home', icon: Home, label: 'Home' },
  { to: '/app/map', icon: Map, label: 'Explore Map' },
  { to: '/app/updates', icon: Megaphone, label: 'Official Updates' },
  { to: '/app/notifications', icon: Bell, label: 'Notifications', badge: true },
  { to: '/app/search', icon: Search, label: 'Search' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

export function Sidebar() {
  const { area, setArea, unreadCount, profile } = useApp()
  const navigate = useNavigate()
  const [areaOpen, setAreaOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ct-sidebar-collapsed') === '1')

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('ct-sidebar-collapsed', next ? '1' : '0')
  }

  const displayName = profile?.username ?? 'Guest'
  const homeArea = profile?.home_area

  return (
    <aside
      aria-label="Primary"
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto border-r border-line/60 bg-bg/90 py-5 backdrop-blur-xl no-scrollbar transition-all duration-300 lg:flex ${
        collapsed ? 'w-[72px] items-center px-2' : 'w-[240px] px-3'
      }`}
    >
      {/* logo + collapse toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-2'}`}>
        <button
          onClick={() => navigate('/app/home')}
          className={`flex items-center gap-2.5 text-left ${collapsed ? 'justify-center' : ''}`}
          aria-label="CivicTrack home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-green to-green-muted text-bg shadow-[0_2px_12px_rgba(0,200,83,0.25)]">
            <MapPin size={18} strokeWidth={2.2} />
          </span>
          {!collapsed && (
            <span className="text-[16px] font-bold tracking-tight whitespace-nowrap">
              Civic<span className="text-green">Track</span>
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors nav-hover hover:text-soft"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={toggle}
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors nav-hover hover:text-soft"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* nav */}
      <nav className={`mt-6 flex flex-col gap-0.5 ${collapsed ? 'items-center' : ''}`}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `relative flex items-center rounded-lg transition-all nav-hover ${
                collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5'
              } text-[13px] font-medium ${
                isActive ? 'bg-ink/[0.06] text-ink' : 'text-muted hover:text-soft'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                {!collapsed && (
                  <>
                    {item.label}
                    {item.badge && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* report button */}
      <button
        onClick={() => navigate('/app/create')}
        className={`mt-5 flex items-center justify-center gap-2 rounded-xl bg-green text-[13px] font-semibold text-bg shadow-[0_2px_12px_rgba(0,200,83,0.2)] transition-all btn-press hover:shadow-[0_4px_20px_rgba(0,200,83,0.3)] ${
          collapsed ? 'h-10 w-10' : 'w-full py-3'
        }`}
        title={collapsed ? 'Report an issue' : undefined}
      >
        <Plus size={16} strokeWidth={2.5} className="shrink-0" />
        {!collapsed && 'Report an issue'}
      </button>

      {/* area switcher */}
      {!collapsed && (
        <div className="relative mt-5 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">My area</p>
          <button
            onClick={() => setAreaOpen((v) => !v)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors nav-hover hover:border-line-light"
          >
            <MapPin size={13} className="text-green" />
            <span className="flex-1 truncate text-[12px] font-medium">{area ?? homeArea ?? 'Nearby'}</span>
            <ChevronDown size={13} className={`text-faint transition-transform ${areaOpen ? 'rotate-180' : ''}`} />
          </button>
          {areaOpen && (
            <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-float">
              <div className="no-scrollbar max-h-64 overflow-y-auto p-1.5">
                {AREAS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setArea(a.name)
                      setAreaOpen(false)
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors nav-hover ${
                      area === a.name ? 'bg-ink/[0.04]' : ''
                    }`}
                  >
                    <span className="text-sm">{a.emoji}</span>
                    <span className="flex-1 truncate text-[12px] font-medium">{a.name}</span>
                    {area === a.name && <span className="h-1.5 w-1.5 rounded-full bg-green" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* user card */}
      <button
        onClick={() => navigate('/app/profile')}
        className={`mt-auto flex items-center rounded-xl border border-line bg-surface text-left transition-all nav-hover hover:border-line-light ${
          collapsed ? 'h-10 w-10 justify-center p-0' : 'gap-3 p-3'
        }`}
        title={collapsed ? displayName : undefined}
      >
        <Avatar color={profile?.avatar_color ?? '#00C853'} name={displayName} size={collapsed ? 32 : 36} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold">{displayName}</span>
              <span className="block truncate text-[10px] text-muted">{homeArea ?? 'Citizen'}</span>
            </span>
            <ChevronDown size={13} className="-rotate-90 text-faint" />
          </>
        )}
      </button>
    </aside>
  )
}
