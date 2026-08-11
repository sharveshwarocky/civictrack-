import type { Category, NotifType, Status } from './types'

export const CATEGORY_META: Record<Category, { emoji: string; label: string }> = {
  Road: { emoji: '🚧', label: 'Road Work' },
  Water: { emoji: '💧', label: 'Water' },
  Garbage: { emoji: '🗑️', label: 'Garbage' },
  Electricity: { emoji: '💡', label: 'Electricity' },
  Traffic: { emoji: '🚦', label: 'Traffic' },
  Drainage: { emoji: '🌊', label: 'Drainage' },
  Other: { emoji: '📍', label: 'Other' },
}

export const STATUS_META: Record<Status, { label: string; color: 'green' | 'red' | 'orange' | 'blue' }> = {
  reported: { label: 'Reported', color: 'orange' },
  under_review: { label: 'Under Review', color: 'orange' },
  in_progress: { label: 'In Progress', color: 'orange' },
  overdue: { label: 'Overdue', color: 'red' },
  completed: { label: 'Completed', color: 'green' },
}

export const PIN_COLOR: Record<Status, 'red' | 'orange' | 'green' | 'blue'> = {
  overdue: 'red',
  reported: 'orange',
  under_review: 'orange',
  in_progress: 'orange',
  completed: 'green',
}

export const NOTIF_TYPE_BG: Record<NotifType, string> = {
  update: 'bg-blue/15',
  reply: 'bg-green/15',
  budget: 'bg-purple/15',
  resolved: 'bg-green/15',
  alert: 'bg-red/15',
  event: 'bg-orange/15',
}

export const CATEGORIES: Category[] = ['Road', 'Water', 'Garbage', 'Electricity', 'Traffic', 'Drainage', 'Other']

/**
 * SLA in days per category — the deadline for a report to reach completion.
 * Keep in sync with sla_interval() in supabase/upgrade-phase2.sql.
 */
export const SLA_DAYS: Record<Category, number> = {
  Road: 15,
  Water: 7,
  Garbage: 5,
  Electricity: 10,
  Traffic: 15,
  Drainage: 10,
  Other: 21,
}
