export type Category = 'Road' | 'Water' | 'Garbage' | 'Electricity' | 'Traffic' | 'Drainage' | 'Other'

export type Status = 'reported' | 'under_review' | 'in_progress' | 'completed' | 'overdue'

export type NotifType = 'update' | 'reply' | 'budget' | 'resolved' | 'alert' | 'event'

export interface CoverSpec {
  type: 'image' | 'gradient'
  src?: string
  from?: string
  to?: string
  emoji?: string
}

export interface Reactions {
  up: number
  heart: number
  down: number
}

export interface OfficialUpdate {
  id: string
  agency: string
  orgId?: string
  verified: boolean
  time: string
  postedAt?: string
  text: string
  progress?: number
  reactions: Reactions
}

export interface TimelineStep {
  label: string
  date: string
  done: boolean
}

export interface Issue {
  id: string
  title: string
  description: string
  area: string
  category: Category
  status: Status
  /** The photo the reporting citizen uploaded (the "before" state). */
  cover: CoverSpec
  /** All citizen photos (before state) — cover is photos[0]. Phase 8 multi-photo. */
  photos?: CoverSpec[]
  /** Org-posted completion proof; only set once the issue is completed. */
  afterCover?: CoverSpec
  /** Hidden by moderation (5+ reports or the reporter was suspended). */
  hidden?: boolean
  reporter: { name: string; color: string; verified: boolean }
  /** Legacy relative label; prefer deriving from createdAt. */
  timePosted: string
  createdAt?: string
  budget: number
  spent: number
  timeline: TimelineStep[]
  days: number
  upvotes: number
  comments: number
  followers: number
  lat: number
  lng: number
  /** Supabase auth uid of the reporting citizen. */
  user_id?: string
  contractor?: string
  /** Legacy free-text due label; prefer expectedAt. */
  expected?: string
  /** SLA deadline (ISO) computed at report time from the category's SLA. */
  expectedAt?: string
  completionPct?: number
  official?: OfficialUpdate
  completedAt?: string
}

/** Mirror of the Settings screen — persisted to profiles.settings (jsonb). */
export interface ProfileSettings {
  theme?: 'dark' | 'light' | 'system'
  notifPush?: boolean
  notifEmail?: boolean
  notifBudget?: boolean
}

/** Citizen profile row — created during onboarding, identified by username. */
export interface Profile {
  user_id: string
  username: string
  home_area: string
  lat?: number | null
  lng?: number | null
  avatar_color: string
  onboarded: boolean
  created_at?: string
  /** Notification/appearance preferences — persisted per user. */
  settings?: ProfileSettings
  /** Soft-ban flag — blocks sign-in and hides content (reversible by admin). */
  suspended?: boolean
  suspended_at?: string | null
  suspended_reason?: string | null
  /** Weekly in-app digest opt-in (default true). */
  digest?: boolean
}

/** Organization row — real email + password, approved by an admin. */
export interface Organization {
  id: string
  email: string
  org_name: string
  department: string
  contact?: string | null
  role: 'org' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  /** Deactivated orgs can't sign in but keep their history (reversible). */
  inactive?: boolean
}

/** Personal notification, stored per user in the DB. */
export interface AppNotification {
  id: string
  user_id: string
  issue_id?: string | null
  icon: string
  title: string
  body: string
  type: NotifType
  read: boolean
  created_at: string
}

/** Comment row persisted in the Supabase comments table. */
export interface DbComment {
  id: string
  issue_id: string
  user_id?: string | null
  username?: string | null
  name?: string | null
  text: string
  time: string
  created_at?: string
  /** Hidden by moderation (5+ reports or the author was suspended). */
  hidden?: boolean
}

export interface Area {
  id: string
  name: string
  emoji: string
  lat: number
  lng: number
}

/** Admin-only view of a citizen account (via admin_list_users RPC). */
export interface AdminUser {
  user_id: string
  email: string | null
  username: string | null
  home_area: string | null
  created_at: string
  issues_count: number
  comments_count: number
  /** Every username this person has ever used, latest first. Admin-only. */
  username_history?: { username: string; changed_at: string }[]
  /** Soft-ban flag — the account can't sign in and its content is hidden. */
  suspended?: boolean
}

/** Moderation queue row (admin-only, via admin_list_queue). */
export interface ModerationItem {
  id: string
  target_type: 'issue' | 'comment'
  target_id: string
  reports_count: number
  status: 'pending' | 'hidden' | 'resolved'
  hidden_by_auto: boolean
  target_title: string | null
  reasons: string[] | null
}

/** Audit-log entry (admin-only, via admin_list_audit). */
export interface AuditEntry {
  actor_email: string | null
  action: string
  target_type: string
  target_id: string | null
  target_summary: string | null
  details: Record<string, unknown> | null
  created_at: string
}
