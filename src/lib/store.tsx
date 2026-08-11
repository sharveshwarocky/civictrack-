import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { friendlyDbError } from './format'
import { nextReaction } from './interactions'
import { SLA_DAYS } from './constants'
import { colorForUserId } from './username'
import type {
  AdminUser,
  AppNotification,
  CoverSpec,
  DbComment,
  Issue,
  NotifType,
  Organization,
  Profile,
  Reactions,
  Status,
  TimelineStep,
} from './types'

export type ThemePref = 'dark' | 'light' | 'system'

export interface Settings {
  theme: ThemePref
  notifPush: boolean
  notifEmail: boolean
  notifBudget: boolean
}

export interface AuthUser {
  email: string
}

export interface NewIssueInput {
  title: string
  description: string
  area: string
  category: Issue['category']
  status: Status
  lat: number
  lng: number
  cover: CoverSpec
}

export interface OfficialUpdateInput {
  text: string
  progress?: number
  budget?: number
  spent?: number
  status?: Status
  afterPhoto?: string // data URL or public URL
  contractor?: string
  timeline?: TimelineStep[]
  orgName: string
}

interface AppState {
  issues: Issue[]
  area: string | null
  setArea: (a: string) => void
  // startup health
  appError: string | null
  clearAppError: () => void
  // citizen session
  sessionReady: boolean
  profileResolved: boolean
  loggedIn: boolean
  user: AuthUser | null
  login: () => void
  logout: () => void
  profile: Profile | null
  needsOnboarding: boolean
  saveProfile: (data: { username: string; homeArea: string; lat?: number; lng?: number }) => Promise<string | null>
  // auth
  sendEmailOtp: (email: string) => Promise<string | null>
  verifyEmailOtp: (email: string, token: string) => Promise<string | null>
  loginWithGoogle: () => Promise<void>
  authError: string | null
  clearAuthError: () => void
  // org password reset
  sendPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  // interactions
  upvoted: Record<string, boolean>
  toggleUpvote: (id: string) => void
  following: Record<string, boolean>
  toggleFollow: (id: string) => void
  reactions: Record<string, 'up' | 'heart' | 'down'>
  reactToOfficial: (issueId: string, r: 'up' | 'heart' | 'down') => void
  addIssue: (input: NewIssueInput) => Promise<string | null>
  ensureIssue: (id: string) => Promise<void>
  comments: Record<string, DbComment[]>
  addComment: (issueId: string, text: string) => void
  deleteComment: (issueId: string, commentId: string) => Promise<string | null>
  deleteIssue: (issueId: string) => Promise<string | null>
  // admin: citizen moderation
  adminUsers: AdminUser[]
  adminUsersError: string | null
  loadAdminUsers: (search?: string) => Promise<void>
  removeUser: (userId: string) => Promise<string | null>
  // notifications
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  // org portal
  org: Organization | null
  loginOrg: (email: string, password: string) => Promise<string | null>
  registerOrg: (data: {
    email: string
    password: string
    orgName: string
    department: string
    contact: string
  }) => Promise<string | null>
  logoutOrg: () => void
  pendingOrgs: Organization[]
  loadPendingOrgs: () => Promise<void>
  approveOrg: (id: string, status: 'approved' | 'rejected') => Promise<void>
  postOfficialUpdate: (issueId: string, data: OfficialUpdateInput) => Promise<string | null>
  // settings
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const AppCtx = createContext<AppState | null>(null)

const DEFAULT_TIMELINE = [
  { label: 'Reported', date: 'Today', done: true },
  { label: 'Inspected', date: '—', done: false },
  { label: 'Funded', date: '—', done: false },
  { label: 'In Progress', date: '—', done: false },
  { label: 'Completed', date: '—', done: false },
]

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  notifPush: true,
  notifEmail: true,
  notifBudget: true,
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('ct-settings')
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Normalize a DB row (lowercase columns) into the app's Issue shape. */
function toIssue(raw: Record<string, unknown>): Issue {
  const r = { ...raw }
  const reporter = r.reporter && typeof r.reporter === 'object'
    ? (r.reporter as Issue['reporter'])
    : { name: 'Citizen', color: '#2ECC71', verified: false }
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    area: String(r.area ?? ''),
    category: (r.category as Issue['category']) ?? 'Other',
    status: (r.status as Status) ?? 'reported',
    cover: r.cover && typeof r.cover === 'object'
      ? (r.cover as CoverSpec)
      : { type: 'gradient', from: '#2C4A6B', to: '#0E1621' },
    afterCover: r.aftercover && typeof r.aftercover === 'object' ? (r.aftercover as CoverSpec) : undefined,
    reporter,
    timePosted: typeof r.timeposted === 'string' ? r.timeposted : 'recently',
    createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
    budget: Number(r.budget ?? 0),
    spent: Number(r.spent ?? 0),
    timeline: Array.isArray(r.timeline) ? (r.timeline as Issue['timeline']) : DEFAULT_TIMELINE,
    days: Math.max(Number(r.days ?? 0), (() => {
      const t = typeof r.created_at === 'string' ? new Date(r.created_at).getTime() : 0
      return t ? Math.floor((Date.now() - t) / 86400000) : 0
    })()),
    upvotes: Number(r.upvotes ?? 0),
    comments: Number(r.comments ?? 0),
    followers: Number(r.followers ?? 0),
    lat: Number(r.lat ?? 13.08),
    lng: Number(r.lng ?? 80.21),
    user_id: typeof r.user_id === 'string' && r.user_id ? r.user_id : undefined,
    contractor: typeof r.contractor === 'string' ? r.contractor : undefined,
    expected: typeof r.expected === 'string' ? r.expected : undefined,
    expectedAt: typeof r.expected_at === 'string' ? r.expected_at : undefined,
    completionPct: typeof r.completionpct === 'number' ? r.completionpct : undefined,
    official: r.official && typeof r.official === 'object' ? (r.official as Issue['official']) : undefined,
    completedAt: typeof r.completed_at === 'string' ? r.completed_at : undefined,
  }
}

/** Serialize an Issue to DB row columns (lowercase names). */
function toDbRow(issue: Issue): Record<string, unknown> {
  const { afterCover, timePosted, completionPct, completedAt, createdAt, expectedAt, ...rest } = issue
  return {
    ...(rest as unknown as Record<string, unknown>),
    ...(afterCover ? { aftercover: afterCover } : {}),
    timeposted: timePosted,
    completionpct: completionPct ?? null,
    completed_at: completedAt ?? null,
    ...(expectedAt ? { expected_at: expectedAt } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = (head.match(/data:(.*?);/) ?? [])[1] ?? 'image/jpeg'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** Upload a data-URL or return an already-public URL unchanged. Null on failure. */
async function uploadPhoto(src: string): Promise<string | null> {
  if (!supabase) return null
  if (!src.startsWith('data:')) return src
  try {
    const blob = dataUrlToBlob(src)
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const path = `issues/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: blob.type })
    if (error) return null
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [area, setAreaState] = useState<string | null>(() => localStorage.getItem('ct-area'))
  const [sessionReady, setSessionReady] = useState(false)
  const [profileResolved, setProfileResolved] = useState(false)
  const [loggedIn, setLoggedIn] = useState<boolean>(() => localStorage.getItem('ct-user') === '1')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [upvoted, setUpvoted] = useState<Record<string, boolean>>({})
  const [following, setFollowing] = useState<Record<string, boolean>>({})
  const [reactions, setReactions] = useState<Record<string, 'up' | 'heart' | 'down'>>({})
  const [comments, setComments] = useState<Record<string, DbComment[]>>({})
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [org, setOrg] = useState<Organization | null>(() => {
    const saved = localStorage.getItem('ct-org')
    if (!saved) return null
    try {
      return JSON.parse(saved) as Organization
    } catch {
      return null
    }
  })
  const [pendingOrgs, setPendingOrgs] = useState<Organization[]>([])
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings()
    const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null
    document.documentElement.classList.toggle('light', s.theme === 'light' || (s.theme === 'system' && mq?.matches === true))
    return s
  })

  const userIdRef = useRef<string | null>(null)
  const profileRef = useRef<Profile | null>(null)
  profileRef.current = profile
  const issuesRef = useRef(issues)
  issuesRef.current = issues
  const upvotedRef = useRef(upvoted)
  upvotedRef.current = upvoted
  const followingRef = useRef(following)
  followingRef.current = following
  const reactionsRef = useRef(reactions)
  reactionsRef.current = reactions

  // ---- theme ----
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      root.classList.toggle('light', settings.theme === 'light' || (settings.theme === 'system' && mq.matches))
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  // ---- demo mode (no Supabase): local-only profile ----
  useEffect(() => {
    if (supabase) return
    const saved = localStorage.getItem('ct-profile')
    if (saved) {
      try {
        const p = JSON.parse(saved) as Profile
        setProfile(p)
        setNeedsOnboarding(false)
        setAreaState((prev) => prev ?? p.home_area)
      } catch {
        setProfile(null)
      }
    }
    setNeedsOnboarding(localStorage.getItem('ct-user') === '1' && !localStorage.getItem('ct-profile'))
    setSessionReady(true)
    setProfileResolved(true)
  }, [])

  // ---- Supabase auth session + profile ----
  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const loadProfileFor = async (uid: string) => {
      userIdRef.current = uid
      const { data } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle()
      if (data) {
        const p = data as Profile
        setProfile(p)
        setNeedsOnboarding(false)
        setAreaState((prev) => prev ?? p.home_area)
        if (p.settings) setSettings((prev) => ({ ...prev, ...p.settings }))
      } else {
        setProfile(null)
        setNeedsOnboarding(true)
      }
      setProfileResolved(true)
    }

    const loadMyFollows = async (uid: string) => {
      const { data } = await client.from('follows').select('issue_id').eq('user_id', uid)
      if (Array.isArray(data)) {
        setFollowing(Object.fromEntries(data.map((f) => [f.issue_id, true])))
      }
    }

    const loadMyVotes = async (uid: string) => {
      const { data } = await client.from('issue_votes').select('issue_id').eq('user_id', uid)
      if (Array.isArray(data)) {
        setUpvoted(Object.fromEntries(data.map((v) => [v.issue_id, true])))
      }
    }

    const loadMyReactions = async (uid: string) => {
      const { data } = await client.from('issue_reactions').select('issue_id, type').eq('user_id', uid)
      if (Array.isArray(data)) {
        const map: Record<string, 'up' | 'heart' | 'down'> = {}
        for (const r of data) {
          if (r.type === 'up' || r.type === 'heart' || r.type === 'down') map[r.issue_id] = r.type
        }
        setReactions(map)
      }
    }

    const loadMyNotifs = async (uid: string) => {
      const { data } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)
      if (Array.isArray(data)) setNotifications(data as AppNotification[])
    }

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      if (u && u.user_metadata?.role !== 'org') {
        setUser({ email: u.email ?? '' })
        setLoggedIn(true)
        setProfileResolved(false) // hold the guards until the profile fetch settles
        localStorage.setItem('ct-user', '1')
        void loadProfileFor(u.id)
        void loadMyFollows(u.id)
        void loadMyVotes(u.id)
        void loadMyReactions(u.id)
        void loadMyNotifs(u.id)
      } else {
        setUser(null)
        setLoggedIn(false)
        setProfile(null)
        setFollowing({})
        setUpvoted({})
        setReactions({})
        setNotifications([])
        userIdRef.current = null
        setProfileResolved(true)
        localStorage.removeItem('ct-user')
      }
    })

    void client.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (u && u.user_metadata?.role !== 'org') {
        setUser({ email: u.email ?? '' })
        setLoggedIn(true)
        localStorage.setItem('ct-user', '1')
        await Promise.all([
          loadProfileFor(u.id),
          loadMyFollows(u.id),
          loadMyVotes(u.id),
          loadMyReactions(u.id),
          loadMyNotifs(u.id),
        ])
      } else {
        setLoggedIn(false)
        setProfileResolved(true)
      }
      setSessionReady(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // ---- startup health check: does the database have the required tables? ----
  const [appError, setAppError] = useState<string | null>(null)
  const clearAppError = useCallback(() => setAppError(null), [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void (async () => {
      const { error } = await supabase.from('profiles').select('user_id').limit(1)
      if (cancelled) return
      if (error && /schema cache|Could not find/i.test(error.message)) {
        setAppError(
          'Database tables not found. Run the SQL setup script from SUPABASE_SETUP.md before using the app.',
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- issues: load from DB (start empty after purge) ----
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (cancelled || error || !Array.isArray(data)) return
      setIssues(data.map((row) => toIssue(row as Record<string, unknown>)))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- comments: initial load ----
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase.from('comments').select('*')
      if (cancelled || error || !Array.isArray(data)) return
      const grouped: Record<string, DbComment[]> = {}
      for (const c of data as DbComment[]) {
        ;(grouped[c.issue_id] ??= []).push(c)
      }
      setComments(grouped)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- realtime: issues, comments, notifications ----
  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const channel = client
      .channel('ct-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, (payload) => {
        const row = payload.new as Record<string, unknown>
        if (!row?.id || !row?.title) return
        const issue = toIssue(row)
        setIssues((prev) => (prev.some((i) => i.id === issue.id) ? prev : [issue, ...prev]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues' }, (payload) => {
        const row = payload.new as Record<string, unknown>
        if (!row?.id) return
        setIssues((prev) => prev.map((i) => (i.id === row.id ? toIssue(row) : i)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'issues' }, (payload) => {
        const id = (payload.old as { id?: string })?.id
        if (id) setIssues((prev) => prev.filter((i) => i.id !== id))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const row = payload.new as unknown as DbComment
        if (!row?.issue_id || !row?.text) return
        setComments((prev) => {
          const list = prev[row.issue_id] ?? []
          if (list.some((c) => c.id === row.id)) return prev
          return { ...prev, [row.issue_id]: [...list, row] }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
        // DELETE payloads only carry the primary key (replica identity), so
        // locate the comment by id across all issue groups.
        const id = (payload.old as { id?: string })?.id
        if (!id) return
        setComments((prev) => {
          const hit = Object.keys(prev).find((iid) => prev[iid].some((c) => c.id === id))
          return hit ? { ...prev, [hit]: prev[hit].filter((c) => c.id !== id) } : prev
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const row = payload.new as unknown as AppNotification
        if (!row?.id || !row?.title) return
        if (userIdRef.current && row.user_id !== userIdRef.current) return
        setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]))
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('realtime subscription unavailable:', status)
        }
      })
    return () => {
      void client.removeChannel(channel)
    }
  }, [])

  const setArea = useCallback((a: string) => {
    setAreaState(a)
    localStorage.setItem('ct-area', a)
  }, [])

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('ct-settings', JSON.stringify(next))
      // Persist to the profile so prefs survive across devices and gate server-side fan-out.
      const uid = userIdRef.current
      if (supabase && uid) {
        void supabase.from('profiles').update({ settings: next }).eq('user_id', uid)
      }
      return next
    })
  }, [])

  const login = useCallback(() => {
    setLoggedIn(true)
    localStorage.setItem('ct-user', '1')
  }, [])

  const logout = useCallback(() => {
    setLoggedIn(false)
    setProfile(null)
    setNeedsOnboarding(false)
    setFollowing({})
    setUpvoted({})
    setReactions({})
    setNotifications([])
    userIdRef.current = null
    localStorage.removeItem('ct-user')
    if (supabase) void supabase.auth.signOut()
  }, [])

  /** Real Supabase email OTP — resolves error message or null on success. */
  const sendEmailOtp = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return null // demo mode: any email works
    // emailRedirectTo makes the magic link in the OTP email land on the CURRENT
    // origin (the deployed URL in prod, localhost in dev) instead of Supabase's
    // configured Site URL — without it, clicks bounce to localhost:5173.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + '/app/home',
      },
    })
    return error?.message ?? null
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<string | null> => {
    if (!supabase) return null // demo mode: any 6-digit code works
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return error?.message ?? null
  }, [])

  const loginWithGoogle = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/app/home' },
    })
    if (error) setAuthError(error.message)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const sendPasswordReset = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return 'Password reset requires Supabase to be configured'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    return error?.message ?? null
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    if (!supabase) return 'Password reset requires Supabase to be configured'
    const { error } = await supabase.auth.updateUser({ password })
    return error?.message ?? null
  }, [])

  // ---- onboarding ----
  const saveProfile = useCallback(
    async (data: { username: string; homeArea: string; lat?: number; lng?: number }) => {
      if (!supabase) {
        const p: Profile = {
          user_id: 'demo',
          username: data.username,
          home_area: data.homeArea,
          lat: null,
          lng: null,
          avatar_color: colorForUserId('demo'),
          onboarded: true,
        }
        localStorage.setItem('ct-profile', JSON.stringify(p))
        localStorage.setItem('ct-area', data.homeArea)
        setProfile(p)
        setNeedsOnboarding(false)
        setAreaState(data.homeArea)
        return null
      }
      const { data: udata } = await supabase.auth.getUser()
      const uid = udata?.user?.id
      if (!uid) return 'You need to be signed in to finish setup'
      const row: Profile = {
        user_id: uid,
        username: data.username.trim(),
        home_area: data.homeArea,
        lat: null, // privacy: never persist precise GPS — home_area is enough
        lng: null,
        avatar_color: colorForUserId(uid),
        onboarded: true,
      }
      const { error } = await supabase.from('profiles').upsert(row)
      if (error) return friendlyDbError(error.message)
      setProfile(row)
      setNeedsOnboarding(false)
      setAreaState(data.homeArea)
      localStorage.setItem('ct-area', data.homeArea)
      return null
    },
    [],
  )

  // ---- load a single issue on demand (e.g. from a notification deep-link) ----
  const ensureIssue = useCallback(async (id: string) => {
    if (!supabase) return
    if (issuesRef.current.some((i) => i.id === id)) return
    const { data } = await supabase.from('issues').select('*').eq('id', id).maybeSingle()
    if (!data) return
    const issue = toIssue(data as Record<string, unknown>)
    setIssues((prev) => (prev.some((i) => i.id === issue.id) ? prev : [issue, ...prev]))
  }, [])

  // ---- upvote ----
  const toggleUpvote = useCallback((id: string) => {
    const active = !upvotedRef.current[id]
    setUpvoted((prev) => ({ ...prev, [id]: active }))
    const current = issuesRef.current.find((i) => i.id === id)?.upvotes ?? 0
    const next = Math.max(0, current + (active ? 1 : -1))
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, upvotes: next } : i)))
    if (!supabase || !userIdRef.current) return // guests get a local-only preview
    // Server-authoritative toggle — one vote per user, persisted across refreshes.
    void supabase
      .rpc('record_vote', { p_issue_id: id })
      .then(({ data, error }) => {
        if (error) {
          console.warn('upvote sync failed:', error.message)
          setUpvoted((prev) => ({ ...prev, [id]: !active }))
          setIssues((prev) =>
            prev.map((i) => (i.id === id ? { ...i, upvotes: Math.max(0, i.upvotes + (active ? -1 : 1)) } : i)),
          )
          return
        }
        if (typeof data === 'number') {
          setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, upvotes: data } : i)))
        }
      })
  }, [])

  // ---- follow (persisted in follows table) ----
  const toggleFollow = useCallback((id: string) => {
    const active = !followingRef.current[id]
    setFollowing((prev) => ({ ...prev, [id]: active }))
    const current = issuesRef.current.find((i) => i.id === id)?.followers ?? 0
    const next = Math.max(0, current + (active ? 1 : -1))
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, followers: next } : i)))
    if (!supabase) return
    const uid = userIdRef.current
    if (!uid) return // guests get a local-only preview; only signed-in users persist
    void (async () => {
      let ok = true
      if (active) {
        const { error } = await supabase!.from('follows').insert({ user_id: uid, issue_id: id })
        if (error) ok = false
      } else {
        const { error } = await supabase!.from('follows').delete().eq('user_id', uid).eq('issue_id', id)
        if (error) ok = false
      }
      if (ok) {
        const { error } = await supabase!.from('issues').update({ followers: next }).eq('id', id)
        if (error) ok = false
      }
      if (!ok) {
        console.warn('follow sync failed — reverting')
        setFollowing((prev) => ({ ...prev, [id]: !active }))
        setIssues((prev) =>
          prev.map((i) => (i.id === id ? { ...i, followers: Math.max(0, i.followers + (active ? -1 : 1)) } : i)),
        )
      }
    })()
  }, [])

  // ---- reaction on official updates ----
  const reactToOfficial = useCallback((issueId: string, r: 'up' | 'heart' | 'down') => {
    const existing = reactionsRef.current[issueId]
    const target = issuesRef.current.find((i) => i.id === issueId)
    if (!target?.official) return
    const o = target.official
    const nextR = { ...o.reactions }
    if (existing) nextR[existing] = Math.max(0, nextR[existing] - 1)
    const active = nextReaction(existing, r)
    if (active) nextR[active] = nextR[active] + 1
    const prevOfficial = o
    const nextOfficial = { ...o, reactions: nextR }
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, official: nextOfficial } : i)))
    setReactions((prev) => {
      const n = { ...prev }
      if (active) n[issueId] = active
      else delete n[issueId]
      return n
    })
    if (!supabase || !userIdRef.current) return // guests keep a local-only preview
    // Server-authoritative — recomputes counts from issue_reactions.
    void supabase
      .rpc('record_reaction', { p_issue_id: issueId, p_type: r })
      .then(({ data, error }) => {
        if (error) {
          console.warn('reaction sync failed:', error.message)
          setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, official: prevOfficial } : i)))
          setReactions((prev) => {
            const n = { ...prev }
            if (existing === r) delete n[issueId]
            else if (existing) n[issueId] = existing
            return n
          })
          return
        }
        const result = data as { reactions?: Reactions; active?: 'up' | 'heart' | 'down' | null } | null
        if (result?.reactions) {
          setIssues((prev) =>
            prev.map((i) =>
              i.id === issueId
                ? { ...i, official: { ...(i.official ?? nextOfficial), reactions: result.reactions! } }
                : i,
            ),
          )
        }
        if (result && 'active' in result) {
          setReactions((prev) => {
            const n = { ...prev }
            if (result.active) n[issueId] = result.active
            else delete n[issueId]
            return n
          })
        }
      })
  }, [])

  // ---- report an issue (photo upload + user_id) ----
  const addIssue = useCallback(async (input: NewIssueInput): Promise<string | null> => {
    const username = profileRef.current?.username ?? 'Citizen'
    let cover = input.cover
    if (cover.type === 'image' && cover.src && cover.src.startsWith('data:')) {
      const url = await uploadPhoto(cover.src)
      if (!url) return 'Photo upload failed — try a smaller image or check your connection.'
      cover = { type: 'image', src: url }
    }
    const issue: Issue = {
      id: 'issue-' + Date.now(),
      title: input.title,
      description: input.description,
      area: input.area,
      category: input.category,
      status: 'reported',
      cover,
      reporter: { name: username, color: colorForUserId(userIdRef.current ?? 'demo'), verified: false },
      timePosted: 'Just now',
      createdAt: new Date().toISOString(),
      expectedAt: new Date(Date.now() + SLA_DAYS[input.category] * 86400000).toISOString(),
      budget: 0,
      spent: 0,
      timeline: DEFAULT_TIMELINE,
      days: 0,
      upvotes: 0,
      comments: 0,
      followers: 0,
      lat: input.lat,
      lng: input.lng,
      user_id: userIdRef.current ?? undefined,
    }
    if (!supabase) {
      setIssues((prev) => [issue, ...prev])
      return null
    }
    const { error } = await supabase.from('issues').insert([toDbRow(issue)])
    return error ? friendlyDbError(error.message) : null
  }, [])

  // ---- delete comment (author or admin) ----
  const deleteComment = useCallback(async (issueId: string, commentId: string): Promise<string | null> => {
    if (!supabase) return null // demo mode: local-only, nothing to delete
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) return friendlyDbError(error.message)
    // Optimistic cleanup in case realtime is delayed.
    setComments((prev) => ({
      ...prev,
      [issueId]: (prev[issueId] ?? []).filter((c) => c.id !== commentId),
    }))
    const current = issuesRef.current.find((i) => i.id === issueId)?.comments ?? 0
    const next = Math.max(0, current - 1)
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, comments: next } : i)))
    await supabase.from('issues').update({ comments: next }).eq('id', issueId)
    return null
  }, [])

  // ---- delete issue (reporter or admin; removes its comments too) ----
  const deleteIssue = useCallback(async (issueId: string): Promise<string | null> => {
    if (!supabase) return null // demo mode: local-only, nothing to delete
    const { error } = await supabase.rpc('delete_issue', { p_issue_id: issueId })
    if (error) return friendlyDbError(error.message)
    // Optimistic cleanup in case realtime is delayed.
    setIssues((prev) => prev.filter((i) => i.id !== issueId))
    setComments((prev) => {
      const next = { ...prev }
      delete next[issueId]
      return next
    })
    return null
  }, [])

  // ---- admin: citizen directory ----
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null)

  const loadAdminUsers = useCallback(async (search?: string) => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('admin_list_users', { p_search: search ?? '' })
    if (error) {
      console.warn('admin_list_users failed:', error.message)
      setAdminUsersError(friendlyDbError(error.message))
      setAdminUsers([])
      return
    }
    setAdminUsersError(null)
    if (Array.isArray(data)) setAdminUsers(data as AdminUser[])
  }, [])

  const removeUser = useCallback(async (userId: string): Promise<string | null> => {
    if (!supabase) return 'Admin portal requires Supabase to be configured'
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
    if (error) return friendlyDbError(error.message)
    setAdminUsers((prev) => prev.filter((u) => u.user_id !== userId))
    // Drop their content from the local feed too.
    setIssues((prev) => prev.filter((i) => i.user_id !== userId))
    return null
  }, [])

  // ---- comments ----
  const addComment = useCallback((issueId: string, text: string) => {
    const t = text.trim()
    if (!t) return
    const username = profileRef.current?.username ?? null
    const uid = userIdRef.current
    const c: DbComment = {
      id: 'c-' + Date.now(),
      issue_id: issueId,
      user_id: uid,
      username,
      text: t,
      time: 'Just now',
      created_at: new Date().toISOString(),
    }
    // optimistic — the realtime INSERT handler dedupes by id
    setComments((prev) => ({ ...prev, [issueId]: [...(prev[issueId] ?? []), c] }))
    const current = issuesRef.current.find((i) => i.id === issueId)?.comments ?? 0
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, comments: current + 1 } : i)))
    if (!supabase) return
    void (async () => {
      const { error } = await supabase!.from('comments').insert(c)
      if (error) {
        console.warn('comment insert failed:', error.message)
        setComments((prev) => ({
          ...prev,
          [issueId]: (prev[issueId] ?? []).filter((x) => x.id !== c.id),
        }))
        setIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, comments: Math.max(0, i.comments - 1) } : i)),
        )
        return
      }
      const { error: cerr } = await supabase!.from('issues').update({ comments: current + 1 }).eq('id', issueId)
      if (cerr) console.warn('comment count sync failed:', cerr.message)
    })()
  }, [])

  // ---- notifications ----
  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    if (supabase) void supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (supabase && userIdRef.current) {
      void supabase.from('notifications').update({ read: true }).eq('user_id', userIdRef.current)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  // ---- org portal ----
  const loginOrg = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!supabase) return 'Org portal requires Supabase to be configured'
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return friendlyDbError(error.message)
    const u = data.user
    if (!u || u.user_metadata?.role !== 'org') {
      if (supabase) void supabase.auth.signOut()
      return 'This account is not registered as an organization'
    }
    const { data: orgRow, error: orgErr } = await supabase.from('organizations').select('*').eq('email', email).maybeSingle()
    if (orgErr) {
      if (supabase) void supabase.auth.signOut()
      return friendlyDbError(orgErr.message)
    }
    if (!orgRow) {
      if (supabase) void supabase.auth.signOut()
      return 'Organization profile not found'
    }
    if (orgRow.status !== 'approved') {
      if (supabase) void supabase.auth.signOut()
      return orgRow.status === 'rejected'
        ? 'This registration was rejected by the admin.'
        : 'Registration is pending admin approval. You will get access once approved.'
    }
    const o = orgRow as Organization
    setOrg(o)
    localStorage.setItem('ct-org', JSON.stringify(o))
    return null
  }, [])

  const registerOrg = useCallback(
    async (data: { email: string; password: string; orgName: string; department: string; contact: string }) => {
      if (!supabase) return 'Org portal requires Supabase to be configured'
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { role: 'org' } },
      })
      if (error) return friendlyDbError(error.message)
      const { error: ierr } = await supabase.from('organizations').insert({
        email: data.email,
        org_name: data.orgName,
        department: data.department,
        contact: data.contact,
        status: 'pending',
        role: 'org',
      })
      if (ierr) return friendlyDbError(ierr.message)
      return null
    },
    [],
  )

  const logoutOrg = useCallback(() => {
    setOrg(null)
    localStorage.removeItem('ct-org')
    if (supabase) {
      // Only sign out when the active session is actually an org — never kill a
      // signed-in citizen's session over a stale local org snapshot.
      const client = supabase
      void client.auth.getUser().then(({ data }) => {
        if (data.user?.user_metadata?.role === 'org') void client.auth.signOut()
      })
    }
  }, [])

  const loadPendingOrgs = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    if (Array.isArray(data)) setPendingOrgs(data as Organization[])
  }, [])

  const approveOrg = useCallback(async (id: string, status: 'approved' | 'rejected') => {
    if (!supabase) return
    const { error } = await supabase.rpc('approve_organization', { p_id: id, p_status: status })
    if (error) {
      console.warn('approve failed:', error.message)
      return
    }
    setPendingOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
  }, [])

  // ---- notify everyone following an issue (or who reported it) ----
  const notifyIssueUsers = useCallback(
    async (issueId: string, notif: { icon: string; title: string; body: string; type: NotifType }) => {
      if (!supabase) return
      // Server-side fan-out: followers + reporter, honoring each user's prefs.
      const { error } = await supabase.rpc('notify_followers', {
        p_issue_id: issueId,
        p_title: notif.title,
        p_body: notif.body,
        p_type: notif.type,
        p_icon: notif.icon,
      })
      if (error) console.warn('notification fan-out failed:', error.message)
    },
    [],
  )

  // ---- org work: official update / budget / complete / after photo ----
  const postOfficialUpdate = useCallback(
    async (issueId: string, data: OfficialUpdateInput): Promise<string | null> => {
      if (!supabase) return 'Org portal requires Supabase to be configured'
      const issue = issuesRef.current.find((i) => i.id === issueId)
      if (!issue) return 'Issue not found'
      const existing = issue.official
      const reactions = existing?.reactions ?? { up: 0, heart: 0, down: 0 }
      let afterCover = issue.afterCover
      if (data.afterPhoto) {
        const url = await uploadPhoto(data.afterPhoto)
        if (!url && data.afterPhoto.startsWith('data:')) return 'Photo upload failed — try a smaller image.'
        if (url) afterCover = { type: 'image', src: url }
      }
      const official = {
        id: existing?.id ?? 'off-' + Date.now(),
        agency: data.orgName,
        orgId: org?.id,
        verified: true,
        time: 'Just now',
        postedAt: new Date().toISOString(),
        text: data.text.trim() || 'Status update posted.',
        ...(data.progress !== undefined ? { progress: data.progress } : {}),
        reactions,
      }
      let notifType: NotifType = 'update'
      let notifTitle = 'New official update'
      let notifIcon = '🏛️'
      const isComplete = data.status === 'completed'
      if (isComplete) {
        notifType = 'resolved'
        notifTitle = 'Issue resolved ✅'
        notifIcon = '✅'
      } else if (data.status) {
        notifTitle = 'Status changed'
        notifIcon = '🔁'
      } else if (data.progress !== undefined) {
        notifTitle = 'Progress updated'
        notifIcon = '📈'
      }
      // Always computed (non-undefined) so it type-checks; only sent when completing.
      const completedTimeline = (issue.timeline ?? DEFAULT_TIMELINE).map((s) =>
        s.label === 'Completed' ? { ...s, date: 'Done', done: true } : s,
      )
      const { error } = await supabase.rpc('post_official_update', {
        p_issue_id: issueId,
        p_official: official,
        ...(data.status ? { p_status: data.status } : {}),
        ...(data.budget !== undefined ? { p_budget: data.budget } : {}),
        ...(data.spent !== undefined ? { p_spent: data.spent } : {}),
        ...(data.progress !== undefined ? { p_completionpct: data.progress } : {}),
        ...(afterCover ? { p_aftercover: afterCover } : {}),
        ...(data.contractor ? { p_contractor: data.contractor } : {}),
        p_clear_expected: isComplete,
        ...(isComplete
          ? { p_completed_at: new Date().toISOString(), p_timeline: completedTimeline }
          : data.timeline
            ? { p_timeline: data.timeline }
            : {}),
      })
      if (error) return friendlyDbError(error.message)
      // Optimistically reflect the change locally so the org sees it instantly,
      // even if realtime hiccups — the UPDATE event replaces it idempotently.
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId              ? {
                  ...i,
                  official,
                  ...(data.status ? { status: data.status } : {}),
                  ...(data.budget !== undefined ? { budget: data.budget } : {}),
                  ...(data.spent !== undefined ? { spent: data.spent } : {}),
                  ...(data.progress !== undefined ? { completionPct: data.progress } : {}),
                  ...(afterCover ? { afterCover } : {}),
                  ...(data.contractor ? { contractor: data.contractor } : {}),
                  ...(isComplete
                    ? {
                        completedAt: new Date().toISOString(),
                        expected: undefined,
                        completionPct: 100,
                        timeline: completedTimeline,
                      }
                    : data.timeline
                      ? { timeline: data.timeline }
                      : {}),
                }
              : i,
        ),
      )
      const body = `${data.orgName} · ${issue.title.slice(0, 60)}${issue.title.length > 60 ? '…' : ''}`
      void notifyIssueUsers(issueId, { icon: notifIcon, title: notifTitle, body, type: notifType })
      if (data.budget !== undefined && data.budget !== issue.budget) {
        void notifyIssueUsers(issueId, {
          icon: '💰',
          title: 'Budget revised',
          body,
          type: 'budget',
        })
      }
      return null
    },
    [notifyIssueUsers, org],
  )

  const value = useMemo<AppState>(
    () => ({
      issues,        area,
        setArea,
        appError,
        clearAppError,
        sessionReady,
      profileResolved,
      loggedIn,
      user,
      login,
      logout,
      profile,
      needsOnboarding,
      saveProfile,
      sendEmailOtp,
      verifyEmailOtp, loginWithGoogle, authError, clearAuthError, sendPasswordReset, updatePassword,
      upvoted,
      toggleUpvote,
      following,
      toggleFollow,
      reactions,
      reactToOfficial,
      addIssue,
      ensureIssue,
      comments,
      addComment,
      deleteComment,
      deleteIssue,
      adminUsers,
      adminUsersError,
      loadAdminUsers,
      removeUser,
      notifications,
      unreadCount,
      markRead,
      markAllRead,
      org,
      loginOrg,
      registerOrg,
      logoutOrg,
      pendingOrgs,
      loadPendingOrgs,
      approveOrg,
      postOfficialUpdate,
      settings,
      setSetting,
    }),
    [
      issues, area, setArea, appError, clearAppError, sessionReady, profileResolved, loggedIn, user, login, logout, profile, needsOnboarding,
      saveProfile, sendEmailOtp, verifyEmailOtp, loginWithGoogle, authError, clearAuthError, sendPasswordReset, updatePassword,
      upvoted, toggleUpvote, following, toggleFollow, reactions, reactToOfficial, addIssue, ensureIssue,
      comments, addComment, deleteComment, deleteIssue, adminUsers, adminUsersError, loadAdminUsers, removeUser,
      notifications, unreadCount, markRead, markAllRead, org, loginOrg,
      registerOrg, logoutOrg, pendingOrgs, loadPendingOrgs, approveOrg, postOfficialUpdate,
      settings, setSetting,
    ],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
