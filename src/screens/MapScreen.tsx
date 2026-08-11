import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { BottomSheet } from '../components/BottomSheet'
import { CivicMap, type MapMarker } from '../components/CivicMap'
import { CoverImage } from '../components/CoverImage'
import { StatusChip } from '../components/StatusChip'
import { budgetShort, shortDate, slaInfo } from '../lib/format'
import { PIN_COLOR } from '../lib/constants'
import { useApp } from '../lib/store'

const PIN_HEX: Record<string, string> = {
  red: '#FF4C4C',
  orange: '#F39C12',
  green: '#2ECC71',
  blue: '#3498DB',
}

const LEGEND = [
  { color: '#FF4C4C', label: 'Major issue' },
  { color: '#F39C12', label: 'Ongoing' },
  { color: '#2ECC71', label: 'Completed' },
  { color: '#3498DB', label: 'Notice' },
]

export default function MapScreen() {
  const { issues, area } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [selectedId, setSelectedId] = useState<string | null>(focusId)

  useEffect(() => {
    if (focusId) setSelectedId(focusId)
  }, [focusId])

  const markers: MapMarker[] = useMemo(
    () =>
      issues.map((i) => ({
        id: i.id,
        lat: i.lat,
        lng: i.lng,
        color: PIN_HEX[PIN_COLOR[i.status]],
      })),
    [issues],
  )

  const selected = issues.find((i) => i.id === selectedId) ?? null
  const selectedSla = selected ? slaInfo(selected) : null
  const areaIssue = area ? issues.find((i) => i.area === area) : undefined
  const center: [number, number] = areaIssue ? [areaIssue.lat, areaIssue.lng] : [13.0878, 80.2101]

  return (
    <div className="relative h-dvh">
      <CivicMap
        center={center}
        zoom={12}
        markers={markers}
        onPinClick={(id) => setSelectedId(id)}
        onMapClick={() => setSelectedId(null)}
        flyToId={selectedId}
      />

      {/* top overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-2xl border border-line bg-bg/85 px-3.5 py-2.5 shadow-lg backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Explore</p>
          <p className="text-sm font-bold">{area ?? 'All areas'}</p>
        </div>
        <div className="pointer-events-auto rounded-2xl border border-line bg-bg/85 px-3 py-2.5 text-[11px] font-semibold text-muted shadow-lg backdrop-blur-xl">
          {markers.length} issues
        </div>
      </div>

      {/* legend */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-4 lg:bottom-6">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg/85 px-3.5 py-2 shadow-lg backdrop-blur-xl">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] font-medium text-ink/85">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* pin details sheet */}
      <BottomSheet open={!!selected} onClose={() => setSelectedId(null)}>
        {selected && (
          <div>
            <div className="flex gap-3">
              <CoverImage cover={selected.cover} className="h-24 w-24 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <StatusChip status={selected.status} />
                <h3 className="mt-1.5 text-[15px] font-bold leading-snug">{selected.title}</h3>
                <p className="mt-0.5 text-[11px] text-muted">📍 {selected.area}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-surface2 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-muted">Budget</p>
                <p className="mt-0.5 text-sm font-bold text-purple">{budgetShort(selected.budget)}</p>
              </div>
              <div className="rounded-xl bg-surface2 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-muted">Due</p>
                <p className={`mt-0.5 text-sm font-bold ${selectedSla?.tone === 'overdue' ? 'text-red' : ''}`}>
                  {selectedSla?.text ?? shortDate(selected.expectedAt) ?? selected.expected ?? '—'}
                </p>
              </div>
              <div className="rounded-xl bg-surface2 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-muted">Contractor</p>
                <p className="mt-0.5 text-[12px] font-bold leading-tight">{selected.contractor ?? 'Not assigned'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedId(null)
                navigate(`/issue/${selected.id}`)
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-green py-3.5 text-sm font-bold text-bg shadow-[0_10px_30px_rgba(46,204,113,0.3)] transition-transform active:scale-[0.98]"
            >
              View full details <ArrowUpRight size={16} />
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
