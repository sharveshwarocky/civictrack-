import { useEffect, useRef, useState } from 'react'
import { Check, Crosshair, Globe2, History, MapPin, Search, X } from 'lucide-react'
import { AREAS, addRecentArea, getRecentAreas, nearbyAreas, resolveAreaName, searchWorldLocations, type WorldCity } from '../lib/areas'
import { getCurrentCoords } from '../lib/geo'
import { BottomSheet } from './BottomSheet'

/**
 * The location chooser: current location on top, then recents + nearby
 * quick access, then a world search over 33k+ cities.
 */
export function LocationPicker({
  open,
  onClose,
  onSelect,
  current,
}: {
  open: boolean
  onClose: () => void
  onSelect: (name: string) => void
  current?: string | null
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<WorldCity[]>([])
  const [searching, setSearching] = useState(false)
  const [currentLoc, setCurrentLoc] = useState<{ name: string; km: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [nearby, setNearby] = useState<{ name: string; country: string; km: number }[]>([])
  const timer = useRef<number | null>(null)
  const locTimer = useRef<number | null>(null)

  // Reset per open + fetch current location quietly.
  useEffect(() => {
    if (!open) return
    setQ('')
    setResults([])
    setLocating(true)
    void (async () => {
      const pos = await getCurrentCoords()
      setLocating(false)
      if (!pos) return
      const name = resolveAreaName(pos.lat, pos.lng)
      if (name) setCurrentLoc({ name, km: 0 })
      setNearby(nearbyAreas(pos.lat, pos.lng, 5))
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (timer.current) window.clearTimeout(timer.current)
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    timer.current = window.setTimeout(async () => {
      const found = await searchWorldLocations(term, 40)
      setResults(found)
      setSearching(false)
    }, 350)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [q, open])

  useEffect(() => () => {
    if (locTimer.current) window.clearTimeout(locTimer.current)
  }, [])

  const pick = (name: string) => {
    addRecentArea(name)
    onSelect(name)
    onClose()
  }

  const renderRow = (name: string, sub: string, active: boolean) => (
    <button
      key={name + sub}
      onClick={() => pick(name)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
        active ? 'border-green/40 bg-green/10' : 'border-line bg-bg/50 hover:border-green/25'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-muted">
        <MapPin size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className="block truncate text-[11px] text-muted">{sub}</span>
      </span>
      {active && <Check size={16} className="shrink-0 text-green" />}
    </button>
  )

  const recents = getRecentAreas().filter((r) => r !== current)
  const searchActive = q.trim().length >= 2

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Choose location</h3>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/[0.05] text-muted transition-colors hover:text-ink"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* search */}
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg/60 px-4 py-3 focus-within:border-green/40">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any city in the world…"
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/50"
          autoFocus={false}
        />
        {q && (
          <button onClick={() => setQ('')} className="shrink-0 text-muted" aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mt-3 max-h-[56vh] space-y-3 overflow-y-auto pr-1">
        {/* search results */}
        {searchActive ? (
          searching ? (
            <p className="py-6 text-center text-[12px] text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted">No places match “{q}”.</p>
          ) : (
            <div className="space-y-1.5">
              {results.map((c) => renderRow(c[0], `${c[2] ? c[2] + ', ' : ''}${c[1]}`, current === c[0]))}
            </div>
          )
        ) : (
          <>
            {/* current location */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                <Crosshair size={11} className="text-green" /> Current location
              </p>
              {currentLoc ? (
                renderRow(currentLoc.name, 'Detected from your GPS', current === currentLoc.name)
              ) : (
                <div className="rounded-xl border border-line bg-bg/50 px-4 py-3 text-[12px] text-muted">
                  {locating ? 'Detecting your location…' : 'Could not detect location — search above or pick nearby.'}
                </div>
              )}
            </div>

            {/* nearby */}
            {nearby.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                  <Globe2 size={11} className="text-blue" /> Nearby
                </p>
                <div className="space-y-1.5">
                  {nearby.map((n) => renderRow(n.name, `${n.country} · ${Math.round(n.km)} km away`, current === n.name))}
                </div>
              </div>
            )}

            {/* recents */}
            {recents.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                  <History size={11} className="text-orange" /> Recent
                </p>
                <div className="space-y-1.5">
                  {recents.map((r) => renderRow(r, 'Previously used', current === r))}
                </div>
              </div>
            )}

            {/* popular / home areas */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">Popular areas</p>
              <div className="space-y-1.5">
                {[...AREAS]
                  .filter((a) => a.name !== current)
                  .slice(0, 8)
                  .map((a) => renderRow(a.name, `📍 ${a.lat.toFixed(3)}°, ${a.lng.toFixed(3)}°`, current === a.name))}
              </div>
              <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-faint">
                🌍 Can't find your place? Start typing — 33,000+ cities worldwide are searchable.
              </p>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
