import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Dices, Loader2, LocateFixed, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { AREAS, areaFromCoords } from '../lib/areas'
import { LocationPicker } from '../components/LocationPicker'
import { getCurrentCoords } from '../lib/geo'
import { useApp } from '../lib/store'
import { colorForSeed, randomUsername } from '../lib/username'

export default function Onboarding() {
  const { saveProfile, profile, checkUsername } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = searchParams.get('edit') === '1'
  const [step, setStep] = useState<'username' | 'area'>('username')
  const [username, setUsername] = useState(() => (isEdit && profile?.username) || randomUsername())
  const [homeArea, setHomeArea] = useState<string | null>(() => (isEdit && profile?.home_area) || null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [worldPickOpen, setWorldPickOpen] = useState(false)
  // live availability check (Phase 8)
  const [taken, setTaken] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const checkTimer = useRef<number | null>(null)
  const checkedRef = useRef<Set<string>>(new Set())

  const rawName = username.trim()
  const valid = rawName.length >= 3
  const available = valid && (isEdit && rawName === profile?.username ? true : taken === false)
  const tooShort = rawName.length > 0 && rawName.length < 3

  // Debounced availability check against the live profiles table.
  useEffect(() => {
    if (!valid) {
      setTaken(null)
      return
    }
    const key = rawName.toLowerCase()
    if (isEdit && rawName === profile?.username) {
      setTaken(null) // own name is always free
      return
    }
    if (checkedRef.current.has(key)) return // already answered for this name
    setChecking(true)
    if (checkTimer.current) window.clearTimeout(checkTimer.current)
    checkTimer.current = window.setTimeout(async () => {
      const isTaken = await checkUsername(rawName)
      checkedRef.current.add(key)
      setTaken(isTaken)
      setChecking(false)
    }, 350)
    return () => {
      if (checkTimer.current) window.clearTimeout(checkTimer.current)
    }
  }, [rawName, valid, checkUsername, isEdit, profile?.username])

  const next = () => {
    if (!valid) return
    if (taken === true) {
      setError('That username is already taken — try another or roll the dice.')
      return
    }
    setError('')
    setStep('area')
  }

  const locate = async () => {
    if (locating) return
    setLocating(true)
    setError('')
    const pos = await getCurrentCoords()
    setLocating(false)
    if (!pos) {
      setError('Could not get your location - allow GPS access or pick an area manually.')
      return
    }
    setCoords(pos)
    const nearest = areaFromCoords(pos.lat, pos.lng)
    if (nearest) setHomeArea(nearest)
    else setError('You are outside covered areas. Pick one manually below.')
  }

  const finish = async () => {
    if (!homeArea) {
      setError('Pick your home area to continue.')
      return
    }
    setBusy(true)
    setError('')
    const err = await saveProfile({ username, homeArea, lat: coords?.lat, lng: coords?.lng })
    if (err) {
      setError(err)
      setBusy(false)
      return
    }
    navigate(isEdit ? '/app/settings' : '/app/home')
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[20%] -top-[20%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,200,83,0.06)_0%,transparent_70%)]" />
      </div>

      {/* Centered content wrapper */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center py-8">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-1.5">
          <span className={`h-1.5 w-6 rounded-full transition-colors ${step === 'username' ? 'bg-green' : 'bg-line'}`} />
          <span className={`h-1.5 w-6 rounded-full transition-colors ${step === 'area' ? 'bg-green' : 'bg-line'}`} />
        </div>

        {step === 'username' ? (
          <>
            {/* Back button */}
            <div className="mb-6 self-start">
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.04] text-muted transition-colors hover:text-ink"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Heading */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-green to-green-muted shadow-[0_4px_24px_rgba(0,200,83,0.25)]">
                <ShieldCheck size={28} strokeWidth={2.2} className="text-bg" />
              </div>
              <h1 className="mt-5 text-[24px] font-bold tracking-tight">
                {isEdit ? 'Edit your username' : 'Choose your username'}
              </h1>
              <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-muted">
                You stay anonymous in feeds and chats — only this username is shown, never your email.
              </p>
            </div>

            {/* Form card */}
            <div className="w-full max-w-[380px]">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Your anonymous username</label>
              <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-4 transition-colors focus-within:border-green/40">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${colorForSeed(username)}, ${colorForSeed(username)}88)` }}
                >
                  {username[0]}
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
                  maxLength={24}
                  className="w-full bg-transparent text-[17px] font-bold tracking-wide text-ink outline-none"
                />
                <button
                  onClick={() => setUsername(randomUsername())}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.05] text-muted transition-all hover:text-green active:rotate-180"
                  title="Randomize username"
                  aria-label="Randomize username"
                >
                  <Dices size={17} />
                </button>
              </div>
              {tooShort && <p className="mt-3 text-center text-[11px] font-medium text-orange">Username must be at least 3 characters.</p>}
              {valid && checking && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-muted">
                  <Loader2 size={11} className="animate-spin" /> Checking availability…
                </p>
              )}
              {valid && !checking && taken === true && !(isEdit && rawName === profile?.username) && (
                <p className="mt-3 text-center text-[11px] font-medium text-red">
                  @{rawName} is already taken — try another or roll the dice.
                </p>
              )}
              {available && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-green">
                  <Check size={11} /> @{rawName} is available!
                </p>
              )}
              {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}
              <p className="mt-3 text-center text-[11px] text-faint">Letters, numbers and underscores — 3-24 chars</p>
              <button
                onClick={next}
                disabled={!valid || taken === true || checking}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all btn-press ${
                  available
                    ? 'bg-green text-bg shadow-[0_4px_20px_rgba(0,200,83,0.25)]'
                    : 'cursor-not-allowed bg-ink/[0.04] text-faint'
                }`}
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Back button */}
            <div className="mb-6 self-start">
              <button
                onClick={() => setStep('username')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.04] text-muted transition-colors hover:text-ink"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Heading */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue to-blue/70 shadow-[0_4px_24px_rgba(41,121,255,0.25)]">
                <MapPin size={28} strokeWidth={2.2} className="text-white" />
              </div>
              <h1 className="mt-5 text-[24px] font-bold tracking-tight">
                {isEdit ? 'Edit your home area' : 'Set your home area'}
              </h1>
              <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-muted">
                This becomes your default feed area. We can detect it from your location, or pick manually.
              </p>
            </div>

            {/* Form card */}
            <div className="w-full max-w-[380px]">
              <button
                onClick={() => void locate()}
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all btn-press ${
                  homeArea && coords ? 'border-green/40 bg-green/10' : 'border-blue/20 bg-blue/[0.06] hover:border-blue/40'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue/15 text-blue">
                  <LocateFixed size={18} className={locating ? 'animate-spin' : ''} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-blue">
                    {homeArea && coords
                      ? `Detected: ${homeArea}`
                      : locating
                        ? 'Detecting your location...'
                        : 'Use my current location'}
                  </span>
                  <span className="block truncate text-[11px] text-blue/60">
                    {coords ? 'Real GPS location captured' : 'Grants location access on login'}
                  </span>
                </span>
                {homeArea && coords && <Check size={16} className="shrink-0 text-green" />}
              </button>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">or pick manually</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                {AREAS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setHomeArea(a.name); setError('') }}
                    className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all card-hover ${
                      homeArea === a.name ? 'border-green/40 bg-green/10' : 'border-line bg-surface'
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-ink/[0.04] text-lg">{a.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{a.name}</span>
                      <span className="block text-[11px] text-muted">{a.lat.toFixed(4)}°, {a.lng.toFixed(4)}°</span>
                    </span>
                    {homeArea === a.name && <Check size={16} className="shrink-0 text-green" />}
                  </button>
                ))}
                <button
                  onClick={() => setWorldPickOpen(true)}
                  className="flex w-full items-center gap-3.5 rounded-xl border border-dashed border-line bg-surface/50 p-3.5 text-left transition-all card-hover hover:border-green/30"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-ink/[0.04] text-lg">🌍</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">Search any city in the world</span>
                    <span className="block text-[11px] text-muted">33,000+ cities — type to find yours</span>
                  </span>
                  {homeArea && !AREAS.some((a) => a.name === homeArea) && <Check size={16} className="shrink-0 text-green" />}
                </button>
              </div>

              {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}
              <button
                onClick={() => void finish()}
                disabled={busy}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all btn-press ${
                  homeArea && !busy
                    ? 'bg-green text-bg shadow-[0_4px_20px_rgba(0,200,83,0.25)]'
                    : 'cursor-not-allowed bg-ink/[0.04] text-faint'
                }`}
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
                ) : (
                  <>
                    <RefreshCw size={15} /> Finish setup
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* world search — pick any city as your home area */}
      <LocationPicker
        open={worldPickOpen}
        onClose={() => setWorldPickOpen(false)}
        onSelect={(name) => { setHomeArea(name); setError('') }}
        current={homeArea}
      />
    </div>
  )
}
