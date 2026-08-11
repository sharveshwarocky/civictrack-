import type { ReactNode } from 'react'
import type { CoverSpec } from '../lib/types'

export function CoverImage({
  cover,
  className,
  children,
}: {
  cover: CoverSpec
  className?: string
  children?: ReactNode
}) {
  if (cover.type === 'image' && cover.src) {
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
