import { NavLink } from 'react-router-dom'
import { Home, Map, Megaphone, Plus, User } from 'lucide-react'

const items = [
  { to: '/app/home', icon: Home, label: 'Home' },
  { to: '/app/map', icon: Map, label: 'Map' },
  { to: '/app/create', icon: Plus, label: '', center: true },
  { to: '/app/updates', icon: Megaphone, label: 'Updates' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-line/60 bg-bg/95 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) =>
          item.center ? (
            <NavLink
              key="create"
              to={item.to}
              className="flex items-center justify-center"
              aria-label="Create report"
            >
              <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-green text-bg shadow-[0_4px_16px_rgba(0,200,83,0.3)] transition-transform active:scale-90">
                <Plus size={22} strokeWidth={2.5} />
              </span>
            </NavLink>
          ) : (
            <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-0.5 py-2.5 pb-3">
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className={`transition-colors ${isActive ? 'text-ink' : 'text-faint'}`}
                  />
                  <span
                    className={`text-[9px] font-medium transition-colors ${isActive ? 'text-ink' : 'text-faint'}`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}
