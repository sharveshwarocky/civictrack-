import type { ReactNode } from 'react'
import type { CoverSpec } from '../lib/types'

/**
 * Renders a photo or gradient cover.
 * - Default: fills the frame (object-cover) — good for tight thumbnails.
 * - `fit`: the real image is never cropped — it's contained (object-contain)
 *   on a blurred, zoomed copy of itself (Instagram-story style letterbox).
 */
export function CoverImage({
  cover,
  className,
  children,
  fit,
}: {
  cover: CoverSpec
  className?: string
  children?: ReactNode
  fit?: boolean
}) {
  if (cover.type === 'image' && cover.src) {
    if (fit) {
      return (
        <div className={`cover-art relative overflow-hidden ${className ?? ''}`}>
          {/* blurred backdrop — the same image, scaled + blurred */}
          <img
            src={cover.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-50"
          />
          {/* the actual photo, contained */}
          <img src={cover.src} alt="" className="absolute inset-0 h-full w-full object-contain" />
          {children}
        </div>
      )
    }
    return (
      <div className={`cover-art ${className ?? ''}`}>
        <img src={cover.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {children}
      </div>
    )
  }
  return (
    <div
      className={`cover-art ${className ?? ''}`}
      style={{
        background: `linear-gradient(135deg, ${cover.from ?? '#1C232D'}, ${cover.to ?? '#0D1117'})`,
      }}
    >
      {/* subtle corner watermark — never a giant centered emoji */}
      <span className="pointer-events-none absolute bottom-2 right-2.5 text-lg opacity-15">
        {cover.emoji ?? '📍'}
      </span>
      {children}
    </div>
  )
}
