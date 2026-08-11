import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AREAS,
  addRecentArea,
  areaFromCoords,
  getArea,
  getRecentAreas,
  nearestKnownCity,
  nearbyAreas,
  resolveAreaName,
} from '../areas'

// node test env has no localStorage — provide a tiny in-memory shim.
const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})

describe('getArea', () => {
  it('finds an area by exact name', () => {
    expect(getArea('Anna Nagar')?.id).toBe('anna-nagar')
    expect(getArea('Nope')).toBeUndefined()
  })
})

describe('areaFromCoords', () => {
  it('resolves the centroid of an area to that area', () => {
    const a = AREAS[0]
    expect(areaFromCoords(a.lat, a.lng)).toBe(a.name)
  })
  it('returns undefined far outside every covered area', () => {
    expect(areaFromCoords(0, 0)).toBeUndefined()
  })
})

describe('resolveAreaName (world-aware)', () => {
  it('prefers a Chennai locality within range', () => {
    expect(resolveAreaName(13.08, 80.21)).toBe('Anna Nagar')
  })
  it('falls back to the nearest world city far from Chennai', () => {
    // Times Square, NYC — nearest curated city is New York.
    expect(resolveAreaName(40.758, -73.985)).toBe('New York')
  })
})

describe('nearestKnownCity + nearbyAreas', () => {
  it('finds New York for Manhattan coordinates', () => {
    const c = nearestKnownCity(40.75, -73.99)
    expect(c?.[0]).toBe('New York')
    expect(c?.[1]).toBe('United States')
  })
  it('returns null beyond maxKm', () => {
    expect(nearestKnownCity(0, 0, 100)).toBeNull()
  })
  it('nearbyAreas returns a sorted list within range', () => {
    const list = nearbyAreas(13.08, 80.21, 3)
    expect(list.length).toBeGreaterThan(0)
    // First result should be Anna Nagar itself (0 km).
    expect(list[0].name).toBe('Anna Nagar')
    expect(list[0].km).toBeLessThanOrEqual(1)
    const kms = list.map((n) => n.km)
    expect(kms).toEqual([...kms].sort((a, b) => a - b))
  })
})

describe('recents (device-local)', () => {
  it('round-trips recent areas and dedupes', () => {
    addRecentArea('Paris')
    addRecentArea('Chennai')
    addRecentArea('Paris')
    const list = getRecentAreas()
    expect(list[0]).toBe('Paris')
    expect(list.filter((x) => x === 'Paris').length).toBe(1)
    expect(list).toContain('Chennai')
  })
})

describe('India resolution (dense tier-2/3 coverage)', () => {
  it('resolves Vellore to Vellore, not Chennai', () => {
    // Vellore city centre
    expect(resolveAreaName(12.9165, 79.1325)).toBe('Vellore')
  })

  it('resolves Shimla correctly', () => {
    expect(resolveAreaName(31.1048, 77.1734)).toBe('Shimla')
  })

  it('resolves Madurai via the Chennai-localities list first', () => {
    // Madurai is one of the AREAS localities
    expect(resolveAreaName(9.9252, 78.1198)).toBe('Madurai')
  })

  it('still resolves Chennai localities with priority', () => {
    expect(resolveAreaName(13.0878, 80.2101)).toBe('Anna Nagar')
  })

  it('nearbyAreas at a tier-2 city returns it within 350 km', () => {
    const near = nearbyAreas(12.9165, 79.1325, 3)
    expect(near[0].name).toBe('Vellore')
    expect(near[0].km).toBeLessThan(5)
  })
})
