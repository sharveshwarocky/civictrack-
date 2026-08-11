import type { Category } from './types'

export interface Department {
  id: string
  name: string
  shortName: string
  icon: string
  color: string
  categories: Category[]
  slaHours: number
  description: string
}

export const DEPARTMENTS: Department[] = [
  { id: 'roads', name: 'Roads & Infrastructure', shortName: 'Roads', icon: '🚧', color: '#F39C12', categories: ['Road'], slaHours: 72, description: 'Potholes, resurfacing, construction, bridges' },
  { id: 'water', name: 'Water Supply', shortName: 'Water', icon: '💧', color: '#3498DB', categories: ['Water'], slaHours: 24, description: 'Pipeline bursts, supply disruption, tankers' },
  { id: 'fire', name: 'Fire Services', shortName: 'Fire', icon: '🔥', color: '#FF4C4C', categories: [], slaHours: 2, description: 'Fires, gas leaks, building safety emergencies' },
  { id: 'electricity', name: 'Electricity', shortName: 'Electric', icon: '⚡', color: '#F1C40F', categories: ['Electricity'], slaHours: 48, description: 'Streetlights, outages, transformers, wiring' },
  { id: 'sanitation', name: 'Sanitation & Waste', shortName: 'Sanitation', icon: '🗑️', color: '#2ECC71', categories: ['Garbage'], slaHours: 48, description: 'Garbage collection, sewage, recycling, dumping' },
  { id: 'traffic', name: 'Traffic & Transport', shortName: 'Traffic', icon: '🚦', color: '#00BCD4', categories: ['Traffic'], slaHours: 36, description: 'Signals, encroachments, parking, road safety' },
  { id: 'drainage', name: 'Drainage', shortName: 'Drainage', icon: '🌊', color: '#009688', categories: ['Drainage'], slaHours: 24, description: 'Flooding, blocked drains, storm water, sewage overflow' },
  { id: 'metro', name: 'Metro & Rail', shortName: 'Metro', icon: '🚇', color: '#9B59B6', categories: [], slaHours: 120, description: 'Metro construction, rail infrastructure, stations' },
  { id: 'environment', name: 'Environment & Parks', shortName: 'Environment', icon: '🌳', color: '#27AE60', categories: [], slaHours: 72, description: 'Parks, trees, air quality, noise pollution, green cover' },
  { id: 'admin', name: 'General Administration', shortName: 'Admin', icon: '🏛️', color: '#607D8B', categories: ['Other'], slaHours: 168, description: 'Policy, inter-dept coordination, citizen verification' },
]

export function getDeptById(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id)
}

export function getDeptCategories(dept: Department): Category[] {
  return dept.categories
}

/** Check if an issue belongs to a department based on category matching. */
export function issueBelongsToDept(dept: Department, issueCategory: Category): boolean {
  if (dept.categories.length === 0) return false
  return dept.categories.includes(issueCategory)
}

export interface SlaTarget {
  department: string
  targetHours: number
  warningThreshold: number // percentage of SLA elapsed to show warning
}

export const SLA_TARGETS: SlaTarget[] = DEPARTMENTS.map((d) => ({
  department: d.id,
  targetHours: d.slaHours,
  warningThreshold: 75,
}))

/** Calculate SLA status for an issue based on its department's target. */
export function getSlaStatus(deptId: string, daysSinceReported: number): 'on-track' | 'warning' | 'overdue' {
  const dept = getDeptById(deptId)
  if (!dept) return 'on-track'
  const hours = daysSinceReported * 24
  const sla = SLA_TARGETS.find((s) => s.department === deptId)
  if (!sla) return 'on-track'
  if (hours > sla.targetHours) return 'overdue'
  if (hours > sla.targetHours * (sla.warningThreshold / 100)) return 'warning'
  return 'on-track'
}
