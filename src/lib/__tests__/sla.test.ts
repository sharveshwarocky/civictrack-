import { describe, expect, it } from 'vitest'
import { shortDate, slaInfo } from '../format'

const DAY = 86400000

describe('slaInfo', () => {
  it('returns null for completed issues', () => {
    expect(slaInfo({ status: 'completed', expectedAt: new Date().toISOString() })).toBeNull()
  })

  it('returns null when there is no deadline', () => {
    expect(slaInfo({ status: 'reported' })).toBeNull()
  })

  it('flags past deadlines as overdue', () => {
    const past = new Date(Date.now() - 3 * DAY).toISOString()
    expect(slaInfo({ status: 'reported', expectedAt: past })).toEqual({ text: '3d overdue', tone: 'overdue' })
  })

  it('counts a deadline a few hours ago as 1d overdue', () => {
    const hoursAgo = new Date(Date.now() - 2 * 3600000).toISOString()
    expect(slaInfo({ status: 'reported', expectedAt: hoursAgo })).toEqual({ text: '1d overdue', tone: 'overdue' })
  })

  it('marks a deadline within 24h as due today (warn)', () => {
    const soon = new Date(Date.now() + 2 * 3600000).toISOString()
    const info = slaInfo({ status: 'in_progress', expectedAt: soon })
    expect(info?.tone).toBe('warn')
    expect(info?.text).toBe('Due today')
  })

  it('marks near deadlines (<=3d) as warn', () => {
    const near = new Date(Date.now() + 2 * DAY).toISOString()
    const info = slaInfo({ status: 'reported', expectedAt: near })
    expect(info?.tone).toBe('warn')
    expect(info?.text).toBe('Due in 2d')
  })

  it('marks far deadlines as ok', () => {
    const far = new Date(Date.now() + 12 * DAY).toISOString()
    const info = slaInfo({ status: 'reported', expectedAt: far })
    expect(info?.tone).toBe('ok')
    expect(info?.text).toBe('Due in 12d')
  })
})

describe('shortDate', () => {
  it('formats an ISO timestamp as a short date (locale-agnostic)', () => {
    const d = shortDate('2026-08-18T00:00:00Z')
    expect(d === 'Aug 18' || d === '18 Aug').toBe(true)
  })

  it('returns null for missing or invalid input', () => {
    expect(shortDate(undefined)).toBeNull()
    expect(shortDate('garbage')).toBeNull()
  })
})
