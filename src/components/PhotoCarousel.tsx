import { useState, type ReactNode } from 'react'
import type { CoverSpec } from '../lib/types'
import { CoverImage } from './CoverImage'

/**
 * Swipable photo strip (Insta-post style) with dot indicators.
 * Falls back to a single image when there's only one photo.
 */
export function PhotoCarousel({
  photos,
  fit,
  className,
  children,
}: {
  photos: CoverSpec[]
  fit?: boolean
  className?: string
  children?: ReactNode
}) {
  const [idx, setIdx] = useState(0)
  const list = photos.length > 0 ? photos : [photos[0]]
  const safe = Math.min(idx, Math.max(0, list.length - 1))

  if (list.length <= 1) {
    return (
      <CoverImage cover={list[0]} fit={fit} className={className}>
        {children}
      </CoverImage>
    )
  }

  return (
    <div className={`group relative overflow-hidden ${className ?? ''}`}>
      <div
        className="flex h-full touch-pan-y transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${safe * 100}%)` }}
      >
        {list.map((p, i) => (
          <div key={i} className="relative h-full w-full shrink-0">
            <CoverImage cover={p} fit={fit} className="absolute inset-0 h-full w-full" />
          </div>
        ))}
      </div>

      {/* swipe hint + dots */}
      {list.length > 1 && (
        <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === safe ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {children}
    </div>
  )
}
