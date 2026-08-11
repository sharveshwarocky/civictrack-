import { describe, expect, it } from 'vitest'
import { AREAS, areaFromCoords, getArea } from '../areas'

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
