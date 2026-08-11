import type { Status, TimelineStep } from './types'

export const TIMELINE_LABELS = ['Reported', 'Inspected', 'Funded', 'In Progress', 'Completed'] as const

/** Default 5-step timeline with only "Reported" done. */
export function defaultTimeline(): TimelineStep[] {
  return TIMELINE_LABELS.map((label, i) => ({ label, date: i === 0 ? 'Today' : '—', done: i === 0 }))
}

/**
 * Derive which timeline steps are done from a work status, so the timeline
 * and the status chip always agree (they previously drifted apart).
 * Existing base dates are preserved (only newly-done steps get 'Today').
 */
export function timelineForStatus(status: Status, base?: TimelineStep[]): TimelineStep[] {
  const doneCount =
    status === 'completed' ? 5 : status === 'in_progress' ? 4 : status === 'under_review' ? 2 : 1
  const labels = base?.length ? base.map((s) => s.label) : TIMELINE_LABELS
  return labels.map((label, i) => {
    const done = i < doneCount
    const existing = base?.[i]
    return {
      label,
      // keep a real date if one was already recorded; only stamp 'Today' on steps
      // that just became done (so the public timeline never reads as fabricated)
      date: done ? existing?.date && existing.date !== '—' ? existing.date : 'Today' : '—',
      done,
    }
  })
}
