import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, type AchievementStats } from '../achievements'
import type { Issue } from '../types'

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: 'i-' + Math.random(),
    title: 'Test issue',
    description: 'desc',
    area: 'Anna Nagar',
    category: 'Road',
    status: 'reported',
    cover: { type: 'gradient', from: '#000', to: '#fff' },
    reporter: { name: 'Citizen', color: '#2ECC71', verified: false },
    timePosted: 'now',
    createdAt: new Date().toISOString(),
    budget: 0,
    spent: 0,
    timeline: [],
    days: 0,
    upvotes: 0,
    comments: 0,
    followers: 0,
    lat: 13.08,
    lng: 80.21,
    ...overrides,
  }
}

function stats(issues: Issue[], extra: Partial<AchievementStats> = {}): AchievementStats {
  return {
    issues,
    resolved: issues.filter((i) => i.status === 'completed').length,
    upvotes: issues.reduce((s, i) => s + i.upvotes, 0),
    commentsPosted: 0,
    following: 0,
    daysActive: 1,
    verified: false,
    homeArea: 'Anna Nagar',
    commentIssueIds: [],
    ...extra,
  }
}

function byId(id: string) {
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  if (!a) throw new Error('missing achievement ' + id)
  return a
}

describe('achievements: 51 entries', () => {
  it('exports at least 50 achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(50)
  })
  it('every achievement has a unique id, emoji and label', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of ACHIEVEMENTS) {
      expect(a.emoji).toBeTruthy()
      expect(a.label).toBeTruthy()
      expect(a.desc).toBeTruthy()
    }
  })
})

describe('achievements: reporting milestones', () => {
  it('first-report earned with 1 report', () => {
    const s = stats([makeIssue({})])
    expect(byId('first-report').earned(s)).toBe(true)
  })
  it('reports-5 earned with exactly 5 reports', () => {
    const s = stats(Array.from({ length: 5 }, () => makeIssue({})))
    expect(byId('reports-5').earned(s)).toBe(true)
  })
  it('reports-100 not earned with 5 reports', () => {
    const s = stats(Array.from({ length: 5 }, () => makeIssue({})))
    expect(byId('reports-100').earned(s)).toBe(false)
  })
})

describe('achievements: categories', () => {
  it('road-warrior earned with 5 road issues', () => {
    const s = stats(Array.from({ length: 5 }, () => makeIssue({ category: 'Road' })))
    expect(byId('road-warrior').earned(s)).toBe(true)
  })
  it('full-spectrum needs all 7 categories', () => {
    const cats: Issue['category'][] = ['Road', 'Water', 'Garbage', 'Electricity', 'Traffic', 'Drainage', 'Other']
    const s = stats(cats.map((c) => makeIssue({ category: c })))
    expect(byId('full-spectrum').earned(s)).toBe(true)
  })
})

describe('achievements: resolution + photos', () => {
  it('problem-solver earned when a report is completed', () => {
    const s = stats([makeIssue({ status: 'completed' })])
    expect(byId('problem-solver').earned(s)).toBe(true)
  })
  it('show-and-tell earned with 2+ photos on a report', () => {
    const s = stats([makeIssue({ photos: [{ type: 'image', src: 'a' }, { type: 'image', src: 'b' }] })])
    expect(byId('show-and-tell').earned(s)).toBe(true)
  })
  it('budget-watcher earned when a report has a budget', () => {
    const s = stats([makeIssue({ budget: 100000 })])
    expect(byId('budget-watcher').earned(s)).toBe(true)
  })
})

describe('achievements: time-of-day + streaks', () => {
  it('night-owl earned when a report is created after 10 PM', () => {
    const late = new Date()
    late.setHours(23, 0, 0, 0)
    const s = stats([makeIssue({ createdAt: late.toISOString() })])
    expect(byId('night-owl').earned(s)).toBe(true)
  })
  it('globetrotter earned with 3 distinct areas', () => {
    const areas = ['Anna Nagar', 'Velachery', 'Adyar']
    const s = stats(areas.map((a) => makeIssue({ area: a })))
    expect(byId('globetrotter').earned(s)).toBe(true)
  })
})
