import type { Issue } from './types'

/** Everything an achievement can read about a citizen — computed live, never stored. */
export interface AchievementStats {
  issues: Issue[]
  resolved: number
  upvotes: number
  commentsPosted: number
  following: number
  daysActive: number
  verified: boolean
  homeArea: string | null
  commentIssueIds: string[]
}

export interface Achievement {
  id: string
  emoji: string
  label: string
  desc: string
  /** Progress denominator (0 = binary achievement). */
  max: number
  value: (s: AchievementStats) => number
  earned: (s: AchievementStats) => boolean
}

function byCategory(issues: Issue[], cat: string): number {
  return issues.filter((i) => i.category === cat).length
}

function distinctAreas(issues: Issue[]): Set<string> {
  return new Set(issues.map((i) => i.area))
}

function hourOf(issue: Issue): number | null {
  const t = issue.createdAt ? new Date(issue.createdAt).getHours() : null
  return t === null ? null : t
}

function dayOf(issue: Issue): string | null {
  return issue.createdAt ? new Date(issue.createdAt).toDateString() : null
}

/** Longest run of consecutive days with at least one report. */
function bestStreak(issues: Issue[]): number {
  const days = [...new Set(issues.map((i) => i.createdAt).filter(Boolean).map((d) => new Date(d!).toDateString()))]
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b)
  if (days.length === 0) return 0
  let best = 1
  let run = 1
  const MS = 86400000
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] <= MS) run++
    else run = 1
    if (run > best) best = run
  }
  return best
}

const has = (pred: (s: AchievementStats) => boolean) => ({ value: () => 0, max: 0, earned: pred })
const counts = (max: number, value: (s: AchievementStats) => number) => ({
  max,
  value,
  earned: (s: AchievementStats) => value(s) >= max,
})

/** 50 realistic achievements, computed live from the citizen's own stats. */
export const ACHIEVEMENTS: Achievement[] = [
  // ---- reporting milestones ----
  { ...counts(1, (s) => s.issues.length), id: 'first-report', emoji: '📝', label: 'First Report', desc: 'File your very first report. Every citizen voice starts here.' },
  { ...counts(5, (s) => s.issues.length), id: 'reports-5', emoji: '📚', label: 'Neighborhood Voice', desc: 'File 5 reports. Your area is listening now.' },
  { ...counts(10, (s) => s.issues.length), id: 'reports-10', emoji: '📈', label: 'Community Reporter', desc: 'File 10 reports and become a trusted source for your area.' },
  { ...counts(25, (s) => s.issues.length), id: 'reports-25', emoji: '🏆', label: 'Civic Champion', desc: 'File 25 reports. Officials know your name.' },
  { ...counts(50, (s) => s.issues.length), id: 'reports-50', emoji: '🎖️', label: 'City Watchdog', desc: 'File 50 reports — a true watchdog for the city.' },
  { ...counts(100, (s) => s.issues.length), id: 'reports-100', emoji: '👑', label: 'Civic Legend', desc: 'File 100 reports. The neighborhood owes you.' },
  // ---- per-category ----
  { ...counts(5, (s) => byCategory(s.issues, 'Road')), id: 'road-warrior', emoji: '🚧', label: 'Road Warrior', desc: 'Report 5 road issues — potholes beware.' },
  { ...counts(5, (s) => byCategory(s.issues, 'Water')), id: 'water-watch', emoji: '💧', label: 'Water Watch', desc: 'Report 5 water issues — keep the supply flowing.' },
  { ...counts(5, (s) => byCategory(s.issues, 'Garbage')), id: 'clean-city', emoji: '🗑️', label: 'Clean City', desc: 'Report 5 garbage issues — one cleaner street at a time.' },
  { ...counts(5, (s) => byCategory(s.issues, 'Electricity')), id: 'bright-spark', emoji: '💡', label: 'Bright Spark', desc: 'Report 5 electricity issues — light up the dark corners.' },
  { ...counts(3, (s) => byCategory(s.issues, 'Traffic')), id: 'traffic-tamer', emoji: '🚦', label: 'Traffic Tamer', desc: 'Report 3 traffic issues — unsnarl the junction.' },
  { ...counts(3, (s) => byCategory(s.issues, 'Drainage')), id: 'drain-master', emoji: '🌊', label: 'Drain Master', desc: 'Report 3 drainage issues — keep the monsoon out.' },
  { ...counts(5, (s) => new Set(s.issues.map((i) => i.category)).size), id: 'five-alarm', emoji: '🎯', label: 'Five-Alarm', desc: 'Report issues in 5 different categories.' },
  { ...counts(7, (s) => new Set(s.issues.map((i) => i.category)).size), id: 'full-spectrum', emoji: '🌐', label: 'Full Spectrum', desc: 'Report issues in every single category.' },
  // ---- support ----
  { ...counts(10, (s) => s.upvotes), id: 'first-support', emoji: '👍', label: 'First Support', desc: 'Earn 10 supports across your reports.' },
  { ...counts(50, (s) => s.upvotes), id: 'popular', emoji: '🌟', label: 'Popular', desc: 'Earn 50 supports — the neighborhood agrees with you.' },
  { ...counts(200, (s) => s.upvotes), id: 'trending-star', emoji: '🚀', label: 'Trending Star', desc: 'Earn 200 supports across your reports.' },
  { ...counts(500, (s) => s.upvotes), id: 'viral', emoji: '🔥', label: 'Virality', desc: 'Earn 500 supports — your voice travels far.' },
  { ...counts(50, (s) => Math.max(0, ...s.issues.map((i) => i.upvotes))), id: 'single-gem', emoji: '💎', label: 'Single Gem', desc: 'Get one report past 50 supports on its own.' },
  // ---- resolution ----
  { ...counts(1, (s) => s.resolved), id: 'problem-solver', emoji: '✅', label: 'Problem Solver', desc: 'Get your first report resolved.' },
  { ...counts(5, (s) => s.resolved), id: 'resolutionist', emoji: '🎉', label: 'Resolutionist', desc: 'Get 5 of your reports resolved.' },
  { ...counts(10, (s) => s.resolved), id: 'fixer-upper', emoji: '🏅', label: 'Fixer Upper', desc: 'Get 10 of your reports resolved.' },
  { ...counts(20, (s) => s.resolved), id: 'mayor-s-list', emoji: '🗂️', label: 'Mayor’s List', desc: 'Get 20 of your reports resolved.' },
  // ---- comments ----
  { ...counts(1, (s) => s.commentsPosted), id: 'first-responder', emoji: '💬', label: 'First Responder', desc: 'Post your first comment on a report.' },
  { ...counts(10, (s) => s.commentsPosted), id: 'chatterbox', emoji: '🗨️', label: 'Chatterbox', desc: 'Post 10 comments across the community.' },
  { ...counts(50, (s) => s.commentsPosted), id: 'town-crier', emoji: '📣', label: 'Town Crier', desc: 'Post 50 comments — you are the community.' },
  { ...counts(5, (s) => s.commentIssueIds.length), id: 'community-buddy', emoji: '👥', label: 'Community Buddy', desc: 'Comment on 5 different reports.' },
  { ...has((s) => s.commentsPosted >= 1 && s.resolved >= 1), id: 'helper', emoji: '🤝', label: 'Helping Hand', desc: 'Comment on a report AND have one of yours resolved.' },
  // ---- following ----
  { ...counts(1, (s) => s.following), id: 'early-follower', emoji: '🔔', label: 'Early Follower', desc: 'Follow your first report to track its progress.' },
  { ...counts(10, (s) => s.following), id: 'well-connected', emoji: '📡', label: 'Well Connected', desc: 'Follow 10 reports — you never miss an update.' },
  // ---- trust ----
  { ...has((s) => s.verified), id: 'verified-resident', emoji: '🛡️', label: 'Verified Resident', desc: 'Verify your email and be active (3+ reports or 30 days).' },
  // ---- activity & streaks ----
  { ...counts(7, (s) => s.daysActive), id: 'one-week-in', emoji: '📅', label: 'One Week In', desc: 'Be an active member for 7 days.' },
  { ...counts(30, (s) => s.daysActive), id: 'monthly-regular', emoji: '🗓️', label: 'Monthly Regular', desc: 'Be an active member for 30 days.' },
  { ...counts(90, (s) => s.daysActive), id: 'quarter-lifer', emoji: '⏳', label: 'Quarter Lifer', desc: 'Be an active member for 90 days.' },
  { ...counts(365, (s) => s.daysActive), id: 'civic-veteran', emoji: '🎂', label: 'Civic Veteran', desc: 'Be an active member for a full year.' },
  { ...counts(3, (s) => bestStreak(s.issues)), id: 'streak-3', emoji: '🔥', label: 'On Fire', desc: 'Report on 3 consecutive days.' },
  { ...counts(7, (s) => bestStreak(s.issues)), id: 'streak-7', emoji: '⚡', label: 'Blazing', desc: 'Report on 7 consecutive days.' },
  { ...counts(3, (s) => s.issues.filter((i) => { const d = dayOf(i); return !!d && Date.now() - new Date(d).getTime() < 7 * 86400000 }).length), id: 'fast-reporter', emoji: '🚴', label: 'Fast Reporter', desc: 'Report 3 issues within a single week.' },
  { ...has((s) => s.issues.some((i) => (hourOf(i) ?? 12) >= 22)), id: 'night-owl', emoji: '🌙', label: 'Night Owl', desc: 'Report an issue after 10 PM.' },
  { ...has((s) => s.issues.some((i) => (hourOf(i) ?? 12) < 8)), id: 'early-bird', emoji: '🌅', label: 'Early Bird', desc: 'Report an issue before 8 AM.' },
  { ...has((s) => { const d = dayOf(s.issues[0]); return !!d && [0, 6].includes(new Date(d).getDay()) }), id: 'weekend-warrior', emoji: '🗓️', label: 'Weekend Warrior', desc: 'Report an issue on a Saturday or Sunday.' },
  { ...counts(5, (s) => s.issues.filter((i) => { const d = dayOf(i); return !!d && [0, 6].includes(new Date(d).getDay()) }).length), id: 'weekend-regular', emoji: '🏖️', label: 'Weekend Regular', desc: 'Report 5 issues on weekends.' },
  { ...counts(3, (s) => distinctAreas(s.issues).size), id: 'globetrotter', emoji: '🌍', label: 'Globetrotter', desc: 'Report issues in 3 different areas.' },
  { ...counts(3, (s) => s.issues.filter((i) => s.homeArea && i.area === s.homeArea).length), id: 'local-hero', emoji: '🏡', label: 'Local Hero', desc: 'Report 3 issues in your home area.' },
  { ...has((s) => s.issues.some((i) => (i.photos?.length ?? 0) >= 2)), id: 'show-and-tell', emoji: '🖼️', label: 'Show and Tell', desc: 'Attach 2+ photos to a single report.' },
  { ...has((s) => s.issues.some((i) => (i.photos?.length ?? 0) >= 3)), id: 'photo-pro', emoji: '📸', label: 'Photo Pro', desc: 'Attach 3+ photos to a single report.' },
  { ...counts(3, (s) => {
    const byDay = new Map<string, number>()
    for (const i of s.issues) {
      if (i.completedAt) {
        const d = new Date(i.completedAt).toDateString()
        byDay.set(d, (byDay.get(d) ?? 0) + 1)
      }
    }
    return Math.max(0, ...byDay.values())
  }), id: 'perfect-day', emoji: '✨', label: 'Perfect Day', desc: 'Have 3 of your reports resolved on the same day.' },
  { ...has((s) => s.issues.some((i) => i.budget > 0)), id: 'budget-watcher', emoji: '🧾', label: 'Budget Watcher', desc: 'Report an issue that receives a sanctioned budget.' },
  { ...counts(5, (s) => s.issues.filter((i) => i.official).length), id: 'official-eyes', emoji: '🏛️', label: 'Official Eyes', desc: 'Get 5 of your reports acknowledged by an official update.' },
  { ...counts(3, (s) => s.issues.filter((i) => i.completionPct !== undefined && i.completionPct >= 50).length), id: 'halfway-there', emoji: '🧱', label: 'Halfway There', desc: 'Watch 3 of your reports pass 50% completion.' },
  { ...counts(5, (s) => s.issues.filter((i) => i.completionPct === 100).length), id: 'fully-delivered', emoji: '📦', label: 'Fully Delivered', desc: 'See 5 of your reports reach 100% completion.' },
]
