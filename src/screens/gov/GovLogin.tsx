import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, Clock, Landmark, Mail, Lock, User } from 'lucide-react'
import { AuthTabs } from '../../components/AuthTabs'
import { DEPARTMENTS } from '../../lib/departments'
import { useApp } from '../../lib/store'

export default function GovLogin() {
  const { loginOrg, registerOrg } = useApp()
  const navigate = useNavigate()
  const [stage, setStage] = useState<'login' | 'register' | 'pending'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS[0]?.id ?? '')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const doLogin = async () => {
    if (!validEmail || password.length < 6) return
    setBusy(true)
    setError('')
    const err = await loginOrg(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/gov/portal/overview')
  }

  const doRegister = async () => {
    if (!validEmail || password.length < 6 || !orgName.trim()) return
    setBusy(true)
    setError('')
    const err = await registerOrg({
      email: email.trim(),
      password,
      orgName: orgName.trim(),
      department,
      contact: contact.trim(),
    })
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setStage('pending')
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg px-6">
      {/* Subtle gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-[20%] -top-[30%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(41,121,255,0.06)_0%,transparent_70%)]" />
        <div className="absolute -left-[20%] -bottom-[20%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(41,121,255,0.04)_0%,transparent_70%)]" />
      </div>

      {/* Centered content wrapper */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center py-8">
        {/* Back button */}
        <div className="mb-8 self-start">
          <button
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.04] text-muted transition-colors hover:text-ink"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Heading */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#2979FF] to-[#2979FF]/80 shadow-[0_4px_24px_rgba(41,121,255,0.2)]">
            <Landmark size={28} strokeWidth={2.2} className="text-white" />
          </div>
          <h1 className="mt-5 text-[24px] font-bold tracking-tight">Government Portal</h1>
          <p className="mt-2 max-w-[360px] text-[13px] leading-relaxed text-muted">
            {stage === 'login' && 'Sign in with your registered organization email and password.'}
            {stage === 'register' && 'Register your organization. Access unlocks after admin approval.'}
            {stage === 'pending' && 'Registration submitted for review.'}
          </p>
        </div>

        {/* Sign in / Sign up switcher (hidden once registered) */}
        {stage !== 'pending' && (
          <div className="mb-8 w-full max-w-[420px]">
            <AuthTabs
              mode={stage === 'register' ? 'signup' : 'signin'}
              accent="blue"
              signUpLabel="Sign up"
              onChange={(m) => {
                setStage(m === 'signup' ? 'register' : 'login')
                setError('')
              }}
            />
          </div>
        )}

        {/* Form card */}
        <div className="w-full max-w-[420px]">
          {stage === 'pending' ? (
            <div className="flex flex-col items-center rounded-2xl border border-blue/20 bg-blue/[0.05] p-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue/15 text-blue">
                <Clock size={26} />
              </span>
              <h2 className="mt-4 text-[16px] font-bold">Pending admin approval</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                Your organization <span className="font-semibold text-ink">{orgName || email}</span> has been registered.
                An administrator must approve it before you can access the portal.
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                Also confirm the verification email we sent to {email}, or sign-in will keep failing even after approval.
              </p>
              <p className="mt-3 rounded-xl bg-bg/60 px-3 py-2 text-[11px] text-muted">
                Registered as: {email} · {DEPARTMENTS.find((d) => d.id === department)?.name ?? department}
              </p>
              <button
                onClick={() => setStage('login')}
                className="mt-5 w-full rounded-xl bg-blue py-3.5 text-[14px] font-semibold text-white transition-all btn-press"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {stage === 'register' && (
                <>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Organization name</label>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors focus-within:border-blue/40">
                    <Building2 size={16} className="shrink-0 text-muted" />
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Greater Chennai Corporation"
                      className="w-full bg-transparent text-[14px] font-medium tracking-wide text-ink outline-none placeholder:text-faint"
                    />
                  </div>

                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Department</label>
                  <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
                    {DEPARTMENTS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDepartment(d.id)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                          department === d.id ? 'border-blue/40 bg-blue/10 text-blue' : 'border-line bg-surface text-muted'
                        }`}
                      >
                        <span>{d.icon}</span> {d.shortName}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <label className={`${stage === 'register' ? 'mt-4' : ''} block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted`}>
                Work email
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors focus-within:border-blue/40">
                <Mail size={16} className="shrink-0 text-muted" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="org@department.gov.in"
                  className="w-full bg-transparent text-[15px] font-medium tracking-wide text-ink outline-none placeholder:text-faint"
                />
              </div>

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Password</label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors focus-within:border-blue/40">
                <Lock size={16} className="shrink-0 text-muted" />
                <input
                  type="password"
                  autoComplete={stage === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent text-[15px] font-medium tracking-wide text-ink outline-none placeholder:text-faint"
                />
              </div>

              {stage === 'register' && (
                <>
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Contact (optional)
                  </label>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors focus-within:border-blue/40">
                    <User size={16} className="shrink-0 text-muted" />
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+91 90000 00000"
                      className="w-full bg-transparent text-[14px] font-medium tracking-wide text-ink outline-none placeholder:text-faint"
                    />
                  </div>
                </>
              )}

              {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}

              <button
                onClick={() => void (stage === 'login' ? doLogin() : doRegister())}
                disabled={!validEmail || password.length < 6 || busy || (stage === 'register' && !orgName.trim())}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all btn-press ${
                  validEmail && password.length >= 6 && !busy && (stage === 'login' || orgName.trim())
                    ? 'bg-blue text-white shadow-[0_4px_20px_rgba(41,121,255,0.25)]'
                    : 'cursor-not-allowed bg-ink/[0.04] text-faint'
                }`}
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    {stage === 'login' ? 'Sign in' : 'Register organization'} <ArrowRight size={16} />
                  </>
                )}
              </button>

              {stage === 'register' && (
                <p className="mt-3 text-center text-[10.5px] leading-relaxed text-faint">
                  Registrations are reviewed by an administrator before the portal unlocks.
                </p>
              )}
            </>
          )}
        </div>

        {/* Citizen login hint */}
        <div className="mt-8 text-center">
          <p className="text-[12px] text-muted">
            Citizen?{' '}
            <button onClick={() => navigate('/login')} className="font-semibold text-green transition-colors hover:text-green/80">
              Sign in with email OTP
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
