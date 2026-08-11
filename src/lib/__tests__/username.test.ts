import { describe, expect, it } from 'vitest'
import { colorForSeed, randomUsername } from '../username'

describe('randomUsername', () => {
  it('generates neutral anonymous usernames (letters + digits, ≤24 chars)', () => {
    for (let i = 0; i < 200; i++) {
      const u = randomUsername()
      expect(u).toMatch(/^[A-Za-z0-9_]{3,24}$/)
      expect(u.length).toBeLessThanOrEqual(24)
    }
  })
  it('produces variety across rolls', () => {
    const seen = new Set(Array.from({ length: 50 }, () => randomUsername()))
    expect(seen.size).toBeGreaterThan(10)
  })
})

describe('colorForSeed', () => {
  it('returns a stable hex color per seed', () => {
    expect(colorForSeed('SwiftOtter42')).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(colorForSeed('SwiftOtter42')).toBe(colorForSeed('SwiftOtter42'))
    expect(colorForSeed('SwiftOtter42')).not.toBe(colorForSeed('RiverLotus99'))
  })
})
