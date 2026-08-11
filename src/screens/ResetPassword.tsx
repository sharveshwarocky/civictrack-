import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'

/**
 * Landing page for Supabase password-recovery links (org portal).
 * The email link carries a recovery token in the URL hash; supabase-js
 * turns it into a session and fires a PASSWORD_RECOVERY event.
 */
export default function ResetPassword() {
  const { updatePassword } = useApp()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking' | 'ready' | 'none' | 'done'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setStatus('none')
      return
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(t)
        setStatus('ready')
      }
    })
    // If no recovery event arrives, the link is missing/expired.
    const t = setTimeout(() => setStatus((s) => (s === 'ready' ? s : 'none')), 3000)
    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const submit = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    const err = await updatePassword(password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setStatus('done')
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(41,121,255,0.06)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#2979FF] to-[#2979FF]/80 shadow-[0_4px_24px_rgba(41,121,255,0.2)]">
          {status === 'done' ? (
            <ShieldCheck size={28} strokeWidth={2.2} className="text-white" />
          ) : (
            <KeyRound size={28} strokeWidth={2.2} className="text-white" />
          )}
        </div>

        {status === 'checking' && (
          <div className="mt-8 flex flex-col items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />
            <p className="mt-4 text-[13px] text-muted">Checking your reset link…</p>
          </div>
        )}

        {status === 'none' && (
          <div className="mt-8">
            <h1 className="text-[22px] font-bold tracking-tight">Link invalid or expired</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              This password-reset link isn't valid anymore. Request a fresh one from the Government Portal sign-in page.
            </p>
            <button
              onClick={() => navigate('/gov')}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue py-3.5 text-[14px] font-semibold text-white transition-all btn-press"
            >
              Back to sign in <ArrowRight size={16} />
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <h1 className="mt-5 text-[22px] font-bold tracking-tight">Set a new password</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Choose a new password for your organization account.
            </p>
            <div className="mt-6 w-full text-left">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-faint focus:border-blue/40"
              />
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit()
                }}
                placeholder="Repeat the password"
                className="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-faint focus:border-blue/40"
              />
              {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}
              <button
                onClick={() => void submit()}
                disabled={busy || password.length < 6}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all btn-press ${
                  busy || password.length < 6
                    ? 'cursor-not-allowed bg-ink/[0.04] text-faint'
                    : 'bg-blue text-white shadow-[0_4px_20px_rgba(41,121,255,0.25)]'
                }`}
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Update password <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {status === 'done' && (
          <div className="mt-8">
            <h1 className="text-[22px] font-bold tracking-tight">Password updated</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Your organization password has been changed. Sign in with the new one.
            </p>
            <button
              onClick={() => navigate('/gov')}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue py-3.5 text-[14px] font-semibold text-white transition-all btn-press"
            >
              Go to sign in <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
