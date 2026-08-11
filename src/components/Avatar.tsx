import type { ReactNode } from 'react'

export function Avatar({
  color,
  name,
  size = 40,
  children,
}: {
  color: string
  name: string
  size?: number
  children?: ReactNode
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: `linear-gradient(135deg, ${color}, ${color}AA)`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 2px 8px ${color}30`,
      }}
    >
      {children ?? initials}
    </div>
  )
}
