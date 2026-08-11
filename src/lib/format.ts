import type { Status } from './types'

export function formatINR(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

/** Short date label, e.g. "18 Aug". Null for missing/invalid input. */
export function shortDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Live SLA label for an open issue: "Due in 12d" / "Due today" / "3d overdue".
 * Null when the issue is completed or has no deadline. Tone drives the color:
 * 'ok' normal, 'warn' ≤ 3 days, 'overdue' past the deadline.
 */
export function slaInfo(issue: { status: Status; expectedAt?: string }): {
  text: string
  tone: 'ok' | 'warn' | 'overdue'
} | null {
  if (issue.status === 'completed' || !issue.expectedAt) return null
  const ms = new Date(issue.expectedAt).getTime()
  if (Number.isNaN(ms)) return null
  const diffMs = ms - Date.now()
  const dayMs = 86400000
  if (diffMs < 0) return { text: `${Math.ceil(-diffMs / dayMs)}d overdue`, tone: 'overdue' }
  if (diffMs < dayMs) return { text: 'Due today', tone: 'warn' }
  const days = Math.ceil(diffMs / dayMs)
  if (days <= 3) return { text: `Due in ${days}d`, tone: 'warn' }
  return { text: `Due in ${days}d`, tone: 'ok' }
}

/**
 * Turn a raw Supabase / PostgREST error into a message a non-developer can
 * understand.  The worst offender is "Could not find the table … in the
 * schema cache" — a schema-cache miss that just means the SQL hasn't been
 * run yet.
 */
export function friendlyDbError(msg: string): string {
  const schemaTable = msg.match(/Could not find the table '?public\.(\w+)'? in the schema cache/i)
  if (schemaTable) {
    const table = schemaTable[1]
    const hints: Record<string, string> = {
      profiles: 'The profiles table is missing. Run supabase/live.sql in your Supabase SQL Editor first.',
      issues: 'The issues table is missing. Run supabase/live.sql in your Supabase SQL Editor first.',
      comments: 'The comments table is missing. Run supabase/live.sql in your Supabase SQL Editor first.',
      follows: 'The follows table is missing. Run supabase/live.sql in your Supabase SQL Editor first.',
      notifications: 'The notifications table is missing. Run supabase/live.sql in your Supabase SQL Editor first.',
      organizations: 'The organizations table is missing. Run supabase/live.sql in your Supabase SQL Editor first.',
    }
    return hints[table] ?? `The "${table}" table is missing. Run supabase/live.sql in your Supabase SQL Editor first.`
  }
  if (/row-level security policy/i.test(msg)) {
    return 'Permission denied. You may need to sign in again.'
  }
  if (/violates (unique|foreign key) constraint/i.test(msg)) {
    return 'This value conflicts with an existing record.'
  }
  if (/permission denied/i.test(msg)) {
    return 'Permission denied — are you signed in?'
  }
  if (/PGRST/i.test(msg)) {
    return 'Database query failed. The table may not exist — run supabase/live.sql first.'
  }
  return msg
}

export function compact(n: number): string {
  if (n >= 10000000) return (n / 10000000).toFixed(1).replace(/\.0$/, '') + ' Cr'
  if (n >= 100000) return (n / 100000).toFixed(1).replace(/\.0$/, '') + ' L'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export function budgetShort(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1).replace(/\.0$/, '') + ' Cr'
  if (n >= 100000) return '₹' + Math.round(n / 100000) + ' Lakhs'
  return formatINR(n)
}

// deterministic pseudo-random from a string (stable per issue)
export function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Live relative label derived from an ISO timestamp — never freezes. */
export function relativeTime(iso?: string | null): string {
  if (!iso) return 'recently'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'recently'
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
