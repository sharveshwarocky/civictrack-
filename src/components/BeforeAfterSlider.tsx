import { useCallback, useRef, useState } from 'react'
import { MoveHorizontal } from 'lucide-react'
import type { CoverSpec } from '../lib/types'
import { CoverImage } from './CoverImage'

export function BeforeAfterSlider({ before, after }: { before: CoverSpec; after: CoverSpec }) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [pos, setPos] = useState(50)

  const update = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(5, Math.min(95, pct)))
  }, [])

  return (
    <div
      ref={ref}
      className="relative h-60 w-full touch-none select-none overflow-hidden rounded-2xl border border-line"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX)
      }}
      onPointerMove={(e) => {
        if (dragging.current) update(e.clientX)
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
    >
      {/* AFTER (base layer) */}
      <CoverImage cover={after} className="absolute inset-0 h-full w-full" />
      {/* BEFORE (clipped layer) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <CoverImage cover={before} className="h-full w-full" />
      </div>

      {/* divider handle */}
      <div className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" style={{ left: `${pos}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-bg/80 text-white shadow-xl backdrop-blur-md">
          <MoveHorizontal size={18} />
        </div>
      </div>

      {/* labels */}
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-orange backdrop-blur-md">
        Before
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-green backdrop-blur-md">
        After
      </span>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
        ◂ Drag to compare ▸
      </span>
    </div>
  )
}
