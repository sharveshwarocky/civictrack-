import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2500)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6">
      {/* Gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,200,83,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-green to-green-muted shadow-[0_8px_40px_rgba(0,200,83,0.3)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-bg">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>

        {/* Name */}
        <h1 className="mt-8 text-[32px] font-extrabold tracking-tight">
          <span className="text-green">Civic</span>
          <span className="text-ink">Track</span>
        </h1>

        {/* Tagline */}
        <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-muted">
          Report issues. Track progress. Build better neighborhoods together.
        </p>

        {/* Loading indicator */}
        <div className="mt-10 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green/60" style={{ animationDelay: '0.2s' }} />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green/30" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}
