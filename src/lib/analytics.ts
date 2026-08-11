import { AREAS } from './areas'
import { STATUS_META } from './constants'
import type { Category, Issue, Status } from './types'

/* ------------------------------------------------------------------ */
/* Chart palette (design-system hexes, with tints where distinction is needed) */
/* ------------------------------------------------------------------ */

export const STATUS_HEX: Record<Status, string> = {
  overdue: '#FF4C4C',
  in_progress: '#F39C12',
  under_review: '#E67E22',
  reported: '#FFB84D',
  completed: '#2ECC71',
}

export const CATEGORY_HEX: Record<Category, string> = {
  Road: '#F39C12',
  Water: '#3498DB',
  Garbage: '#2ECC71',
  Electricity: '#9B59B6',
  Traffic: '#FF4C4C',
  Drainage: '#00C9A7',
  Other: '#8B949E',
}

export const STATUS_ORDER: Status[] = ['overdue', 'in_progress', 'under_review', 'reported', 'completed']

export function statusBreakdown(issues: Issue[]) {
  return STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_META[s].label,
    hex: STATUS_HEX[s],
    count: issues.filter((i) => i.status === s).length,
  }))
}

export function categoryBreakdown(issues: Issue[]) {
  const map = new Map<Category, number>()
  for (const i of issues) map.set(i.category, (map.get(i.category) ?? 0) + 1)
  return Array.from(map.entries())
    .map(([cat, count]) => ({ cat, count, hex: CATEGORY_HEX[cat] }))
    .sort((a, b) => b.count - a.count)
}

export function areaBreakdown(issues: Issue[]) {
  return AREAS.map((a) => {
    const list = issues.filter((i) => i.area === a.name)
    return {
      name: a.name,
      emoji: a.emoji,
      total: list.length,
      open: list.filter((i) => i.status !== 'completed').length,
      completed: list.filter((i) => i.status === 'completed').length,
      overdue: list.filter((i) => i.status === 'overdue').length,
      budget: list.reduce((s, i) => s + i.budget, 0),
      support: list.reduce((s, i) => s + i.upvotes, 0),
    }
  })
}

export function budgetTotals(issues: Issue[]) {
  const total = issues.reduce((s, i) => s + i.budget, 0)
  const spent = issues.reduce((s, i) => s + i.spent, 0)
  const remaining = Math.max(0, total - spent)
  return { total, spent, remaining, pct: total > 0 ? Math.round((spent / total) * 100) : 0 }
}

export function supportTotal(issues: Issue[]) {
  return issues.reduce((s, i) => s + i.upvotes, 0)
}

export function sentimentTotals(issues: Issue[]) {
  let up = 0
  let heart = 0
  let down = 0
  for (const i of issues) {
    if (!i.official) continue
    up += i.official.reactions.up
    heart += i.official.reactions.heart
    down += i.official.reactions.down
  }
  return { up, heart, down }
}

export interface ContractorStat {
  name: string
  projects: number
  active: number
  completed: number
  overdue: number
  budget: number
  spent: number
  completion: number
}

export function contractorStats(issues: Issue[]) {
  const map = new Map<string, Issue[]>()
  for (const i of issues) {
    if (!i.contractor) continue
    const list = map.get(i.contractor) ?? []
    list.push(i)
    map.set(i.contractor, list)
  }
  return Array.from(map.entries()).map(([name, list]): ContractorStat => {
    const budget = list.reduce((s, i) => s + i.budget, 0)
    const spent = list.reduce((s, i) => s + i.spent, 0)
    const completion =
      list.length > 0
        ? Math.round(
            list.reduce((s, i) => s + (i.completionPct ?? (i.budget > 0 ? (i.spent / i.budget) * 100 : 0)), 0) /
              list.length,
          )
        : 0
    return {
      name,
      projects: list.length,
      active: list.filter((i) => i.status === 'in_progress' || i.status === 'reported' || i.status === 'under_review').length,
      completed: list.filter((i) => i.status === 'completed').length,
      overdue: list.filter((i) => i.status === 'overdue').length,
      budget,
      spent,
      completion,
    }
  })
}
