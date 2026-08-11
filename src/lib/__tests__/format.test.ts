import { describe, expect, it } from 'vitest'
import { budgetShort, compact, formatINR, relativeTime } from '../format'

describe('formatINR', () => {
  it('formats rupees with Indian grouping', () => {
    expect(formatINR(100000)).toBe('₹1,00,000')
    expect(formatINR(0)).toBe('₹0')
  })
})

describe('compact', () => {
  it('compresses large numbers', () => {
    expect(compact(500)).toBe('500')
    expect(compact(1500)).toBe('1.5k')
    expect(compact(250000)).toBe('2.5 L')
    expect(compact(12000000)).toBe('1.2 Cr')
  })
})

describe('budgetShort', () => {
  it('shows lakhs, crores and plain rupees', () => {
    expect(budgetShort(150000)).toBe('₹2 Lakhs')
    expect(budgetShort(12000000)).toBe('₹1.2 Cr')
    expect(budgetShort(5000)).toBe('₹5,000')
  })
})

describe('relativeTime', () => {
  const now = Date.now()
  it('returns Just now for fresh timestamps', () => {
    expect(relativeTime(new Date(now - 10000).toISOString())).toBe('Just now')
  })
  it('returns minutes', () => {
    expect(relativeTime(new Date(now - 5 * 60000).toISOString())).toBe('5m ago')
  })
  it('returns hours', () => {
    expect(relativeTime(new Date(now - 3 * 3600000).toISOString())).toBe('3h ago')
  })
  it('returns days', () => {
    expect(relativeTime(new Date(now - 2 * 86400000).toISOString())).toBe('2d ago')
  })
  it('falls back for missing or garbage input', () => {
    expect(relativeTime(undefined)).toBe('recently')
    expect(relativeTime('not-a-date')).toBe('recently')
  })
})
