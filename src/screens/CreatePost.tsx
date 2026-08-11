import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, LocateFixed, X } from 'lucide-react'
import { Marker } from 'react-leaflet'
import { CivicMap, darkIcon } from '../components/CivicMap'
import { CoverImage } from '../components/CoverImage'
import { CATEGORIES, CATEGORY_META } from '../lib/constants'
import { AREAS, getArea } from '../lib/areas'
import { fmtCoords, getCurrentCoords } from '../lib/geo'
import { useApp } from '../lib/store'
import type { Category, CoverSpec } from '../lib/types'

const STEPS = ['Photo', 'Location', 'Category', 'Details']

export default function CreatePost() {
  const { area, profile, addIssue } = useApp()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [photo, setPhoto] = useState<CoverSpec | null>(null)
  const [pos, setPos] = useState<[number, number] | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [category, setCategory] = useState<Category | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canNext =
    (step === 0 && !!photo) ||
    (step === 1 && !!pos) ||
    (step === 2 && !!category) ||
    (step === 3 && title.trim().length > 0)

  const pickFile = (f: File | undefined) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setPhoto({ type: 'image', src: String(reader.result) })
    reader.readAsDataURL(f)
  }

  const detect = async () => {
    if (detecting || pos) return
    setDetecting(true)
    setError('')
    const coords = await getCurrentCoords(8000)
    setDetecting(false)
    if (coords) {
      setPos([coords.lat, coords.lng])
      return
    }
    // fallback: drop near the current area centroid so users can still report
    const base = getArea(area ?? '') ?? AREAS[0]
    setPos([base.lat + (Math.random() - 0.5) * 0.02, base.lng + (Math.random() - 0.5) * 0.02])
    setError('GPS unavailable — pin placed near your area. Drag it to the exact spot.')
  }

  const submit = async () => {
    if (!canNext || !category || !pos) return
    setSubmitting(true)
    setError('')
    const err = await addIssue({
      title: title.trim(),
      description: desc.trim() || 'Reported via CivicTrack. Details to follow.',
      area: area ?? profile?.home_area ?? 'Anna Nagar',
      category,
      status: 'reported',
      lat: pos[0],
      lng: pos[1],
      cover: photo ?? { type: 'gradient', from: '#2C4A6B', to: '#0E1621' },
    })
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/app/home')
  }

  return (
    <div className="min-h-dvh bg-bg px-5 pb-10">
      {/* progress header */}
      <div className="sticky top-0 z-30 -mx-5 border-b border-line bg-bg/90 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 0 ? navigate('/app/home') : setStep((s) => s - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted transition-colors hover:text-ink"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest text-muted">
              <span>Step {step + 1} of 4</span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-green transition-all duration-500"
                style={{ width: `${((step + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {/* STEP 1 — photo */}
        {step === 0 && (
          <div>
            {photo ? (
              <CoverImage cover={photo} className="relative h-80 w-full rounded-2xl">
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-green backdrop-blur-md">
                  ✓ Photo ready
                </span>
              </CoverImage>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface text-muted transition-colors hover:border-green/40"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface2">
                  <Camera size={28} />
                </span>
                <span className="text-sm font-semibold text-ink">Add a photo of the issue</span>
                <span className="text-[12px]">This becomes the "before" photo for before → after proof</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <ImagePlus size={17} className="text-blue" /> {photo ? 'Change photo' : 'Camera / Gallery'}
              </button>
              {photo && (
                <button
                  onClick={() => setPhoto(null)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3.5 text-sm font-semibold text-muted transition-colors active:scale-[0.98]"
                >
                  <X size={17} /> Remove
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[11px] text-faint">
              Uploading as @{profile?.username ?? 'anonymous'} — your email is never shown
            </p>
          </div>
        )}

        {/* STEP 2 — location */}
        {step === 1 && (
          <div>
            <div className="h-64 w-full overflow-hidden rounded-2xl border border-line">
              {pos ? (
                <CivicMap center={pos} zoom={15}>
                  <Marker
                    position={pos}
                    icon={darkIcon('#2ECC71')}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = (e.target as { getLatLng: () => { lat: number; lng: number } }).getLatLng()
                        setPos([ll.lat, ll.lng])
                      },
                    }}
                  />
                </CivicMap>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface2">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />
                  <span className="text-sm font-semibold text-muted">
                    {detecting ? 'Detecting GPS location…' : 'Waiting for location'}
                  </span>
                </div>
              )}
            </div>
            {pos && (
              <p className="mt-3 text-center text-[12px] text-muted">
                📍 {fmtCoords(pos[0], pos[1])} · drag the pin to adjust
              </p>
            )}
            {error && <p className="mt-2 text-center text-[11px] font-medium text-orange">{error}</p>}
            <button
              onClick={() => void detect()}
              disabled={!!pos}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition-all active:scale-[0.98] ${
                pos ? 'cursor-default bg-green/10 text-green' : 'bg-blue text-bg shadow-[0_10px_30px_rgba(52,152,219,0.3)]'
              }`}
            >
              <LocateFixed size={18} />
              {pos ? 'Location locked' : detecting ? 'Detecting…' : 'Auto-detect location'}
            </button>
          </div>
        )}

        {/* STEP 3 — category */}
        {step === 2 && (
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat]
              const active = category === cat
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all active:scale-95 ${
                    active ? 'border-green bg-green/10' : 'border-line bg-surface hover:border-green/30'
                  }`}
                >
                  <span className="text-3xl">{meta.emoji}</span>
                  <span className={`text-[12px] font-semibold ${active ? 'text-green' : 'text-ink/80'}`}>{meta.label}</span>
                  {active && <Check size={16} className="text-green" />}
                </button>
              )
            })}
          </div>
        )}

        {/* STEP 4 — details */}
        {step === 3 && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Road has become dangerous after rain"
              className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-muted/50 focus:border-green/50"
            />
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted">Description (optional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Add more context for the officials…"
              className="mt-2 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted/50 focus:border-green/50"
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {category && (
                <span className="rounded-full bg-green/10 px-3 py-1.5 text-[12px] font-semibold text-green">
                  {CATEGORY_META[category].emoji} {CATEGORY_META[category].label}
                </span>
              )}
              <span className="rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted">
                📍 {area ?? profile?.home_area ?? 'Anna Nagar'}
              </span>
            </div>
            {error && <p className="mt-3 text-center text-[11px] font-medium text-red">{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={!canNext || submitting}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition-all active:scale-[0.98] ${
                canNext && !submitting
                  ? 'bg-green text-bg shadow-[0_10px_30px_rgba(46,204,113,0.35)]'
                  : 'cursor-not-allowed bg-surface text-muted'
              }`}
            >
              {submitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
              ) : (
                <>
                  Submit report <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* nav buttons (steps 0-2) */}
      {step < 3 && (
        <button
          onClick={() => setStep((s) => s + 1)}
          disabled={!canNext}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition-all active:scale-[0.98] ${
            canNext ? 'bg-green text-bg shadow-[0_10px_30px_rgba(46,204,113,0.35)]' : 'cursor-not-allowed bg-surface text-muted'
          }`}
        >
          Continue <ArrowRight size={18} />
        </button>
      )}
    </div>
  )
}
