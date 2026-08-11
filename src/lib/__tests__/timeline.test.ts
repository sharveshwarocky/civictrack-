import { describe, expect, it } from 'vitest'
import { defaultTimeline, timelineForStatus, TIMELINE_LABELS } from '../timeline'

describe('timelineForStatus', () => {
  it('maps every status to a consistent done-count', () => {
    const cases: [string, number][] = [
      ['reported', 1],
      ['under_review', 2],
      ['in_progress', 4],
      ['completed', 5],
    ]
    for (const [status, done] of cases) {
      const tl = timelineForStatus(status as never)
      expect(tl).toHaveLength(TIMELINE_LABELS.length)
      expect(tl.filter((s) => s.done).length).toBe(done)
    }
  })

  it('preserves custom labels when a base timeline is given', () => {
    const base = defaultTimeline()
    base[1] = { label: 'Site survey', date: '—', done: false }
    const tl = timelineForStatus('completed', base)
    expect(tl[1].label).toBe('Site survey')
    expect(tl.every((s) => s.done)).toBe(true)
  })

  it('all steps carry a real date once done', () => {
    const tl = timelineForStatus('in_progress' as never)
    const doneSteps = tl.filter((s) => s.done)
    expect(doneSteps.every((s) => s.date !== '—')).toBe(true)
  })
})

