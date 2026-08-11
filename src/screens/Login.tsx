import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, MapPin, Users } from 'lucide-react'
import { AuthTabs } from '../components/AuthTabs'
import { useApp } from '../lib/store'
import { isLive } from '../lib/supabase'

const FEATURES = [
  { icon: MapPin, title: 'Report local issues', desc: 'Roads, water, garbage & more — with photos and exact location.' },
  { icon: Users, title: 'Track official progress', desc: 'Follow reports, get updates, and watch budgets get spent.' },
  { icon: CheckCircle2, title: 'Stay anonymous', desc: 'Your email is never shown — only your random username.' },
]

export default function Login() {
  const { login, sendEmailOtp, verifyEmailOtp, loginWithGoogle, authError, clearAuthError } = useApp()
  const navigate = useNavigate()
  const [stage, setStage] = useState<'email' | 'otp'>('email')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const trimmed = email.trim().toLowerCase()
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  const code = otp.join('')

  const sendOtp = async () => {
    if (!validEmail) return
    setBusy(true)
    setError('')
    const err = await sendEmailOtp(trimmed)
    if (err) {
      setError(err)
      setBusy(false)
      return
    }
    setBusy(false)
    setStage('otp')
    clearAuthError()
  }

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    setOtp((prev) => {
      const next = [...prev]
      next[i] = d
      return next
    })
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }

  useEffect(() => {
    if (stage === 'otp') refs.current[0]?.focus()
  }, [stage])

  const verify = async () => {
    if (code.length < 6) return
    setBusy(true)
    setError('')
    const err = await verifyEmailOtp(trimmed, code)
    if (err) {
      setError(err)
      setBusy(false)
      return
    }
    // Demo mode (no Supabase) falls straight through here.
    login()
    navigate('/app/home')
  }

  const google = async () => {
    setError('')
    if (!isLive) {
      login()
      navigate('/app/home')
      return
    }
    await loginWithGoogle()
  }

  return (
    <div className="min-h-dvh bg-bg md:flex">
      {/* ── Left branding panel (desktop only) ── */}
      <div className="relative hidden flex-1 overflow-hidden md:flex md:flex-col md:justify-between md:p-8 xl:p-16">
        {/* gradient backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[15%] -top-[25%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(0,200,83,0.14)_0%,transparent_70%)]" />
          <div className="absolute -bottom-[30%] -right-[20%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(41,121,255,0.08)_0%,transparent_70%)]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-green to-green-muted shadow-[0_4px_20px_rgba(0,200,83,0.35)]">
            <MapPin size={22} strokeWidth={2.2} className="text-bg" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-green">Civic</span>
            <span className="text-ink">Track</span>
          </span>
        </div>

        <div className="relative z-10 max-w-[460px]">
          <h2 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[30px] xl:text-[40px]">
            Fix your neighborhood, <span className="text-green">one report at a time.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Join thousands of citizens holding local departments accountable — from potholes to streetlights.
          </p>
          <div className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green/10 text-green">
                  <f.icon size={20} />
                </span>
                <div>
                  <p className="text-[15px] font-bold">{f.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[12px] text-faint">© {new Date().getFullYear()} CivicTrack · Built for accountable neighborhoods</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-10 md:flex-1 md:border-l md:border-line md:px-12">
        {/* mobile-only gradient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden md:hidden">
          <div className="absolute -left-[30%] -top-[30%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,200,83,0.08)_0%,transparent_70%)]" />
        </div>

        {/* back button (mobile) */}
        <div className="absolute left-4 top-4 z-10 md:hidden">
          <button
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.04] text-muted transition-colors hover:text-ink"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="relative z-10 w-full max-w-[400px]">
          {/* heading */}
          <div className="mb-8 flex flex-col items-center text-center md:items-start md:text-left">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-green to-green-muted shadow-[0_4px_24px_rgba(0,200,83,0.3)] md:hidden">
              <MapPin size={26} strokeWidth={2.2} className="text-bg" />
            </div>
            <h1 className="mt-5 text-[26px] font-bold tracking-tight md:mt-0 md:text-[27px] xl:text-[28px]">
              {mode === 'signin' ? 'Sign in to CivicTrack' : 'Create your account'}
            </h1>
            <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-muted">
              {stage === 'email'
                ? mode === 'signin'
                  ? 'Verify your email to report issues in your area.'
                  : 'First time here? Verify your email — you\u2019ll pick an anonymous username and home area next.'
                : 'Enter the 6-digit code sent to ' + trimmed}
            </p>
          </div>

          {/* Sign in / Sign up switcher */}
          <AuthTabs
            mode={mode}
            onChange={(m) => {
              setMode(m)
              setStage('email')
              setError('')
            }}
          />

          {/* form */}
          {stage === 'email' ? (
            <>
              <label htmlFor="login-email" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Email address</label>
              <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors focus-within:border-green/40">
                <Mail size={16} className="shrink-0 text-muted" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-[15px] font-medium tracking-wide text-ink outline-none placeholder:text-faint"
                />
              </div>
              {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}
              <button
                onClick={() => void sendOtp()}
                disabled={!validEmail || busy}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all btn-press ${
                  validEmail && !busy
                    ? 'bg-green text-bg shadow-[0_4px_20px_rgba(0,200,83,0.25)]'
                    : 'cursor-not-allowed bg-ink/[0.04] text-faint'
                }`}
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Send OTP' : 'Create account'} <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <button
                onClick={() => void google()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface py-3.5 text-[14px] font-semibold transition-all btn-press hover:border-line-light"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </button>

              {!isLive && (
                <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">
                  Demo mode — any email &amp; any 6-digit code works.
                  <br />
                  Configure Supabase Auth for real OTP + Google login.
                </p>
              )}
              {authError && <p className="mt-3 text-center text-[11px] font-medium text-red">{authError}</p>}
            </>
          ) : (
            <>
              <div className="flex justify-between gap-2.5">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    aria-label={`OTP digit ${i + 1} of 6`}
                    ref={(el) => { refs.current[i] = el }}
                    inputMode="numeric"
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    className="h-[52px] w-full rounded-xl border border-line bg-surface text-center text-[18px] font-bold text-ink outline-none transition-colors focus:border-green/50"
                  />
                ))}
              </div>
              {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}
              <button
                onClick={() => void verify()}
                disabled={code.length < 6 || busy}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all btn-press ${
                  code.length === 6 && !busy
                    ? 'bg-green text-bg shadow-[0_4px_20px_rgba(0,200,83,0.25)]'
                    : 'cursor-not-allowed bg-ink/[0.04] text-faint'
                }`}
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
                ) : (
                  'Verify & Continue'
                )}
              </button>
              <button
                onClick={() => {
                  setStage('email')
                  setError('')
                }}
                className="mt-4 w-full text-center text-[12px] font-medium text-muted transition-colors hover:text-ink"
              >
                ← Change email
              </button>
              {!isLive && (
                <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">
                  Demo mode — any 6-digit code works.
                </p>
              )}
            </>
          )}

          {/* org portal hint */}
          <div className="mt-8 text-center">
            <p className="text-[12px] text-muted">
              Organization account?{' '}
              <button onClick={() => navigate('/gov')} className="font-semibold text-blue transition-colors hover:text-blue/80">
                Sign in to the Government Portal
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
