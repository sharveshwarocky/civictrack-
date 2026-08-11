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
  /** Org-posted completion proof; only set once the issue is completed. */
  afterCover?: CoverSpec
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
}

export interface Area {
  id: string
  name: string
  emoji: string
  lat: number
  lng: number
}
