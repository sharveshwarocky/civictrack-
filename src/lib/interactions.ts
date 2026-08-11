/** Pure interaction logic shared by the UI and the Phase 1 SQL RPCs. */

export type ReactionKey = 'up' | 'heart' | 'down'

/** Preference flags — the same shape stored in profiles.settings. */
export interface NotifPrefs {
  notifPush?: boolean
  notifEmail?: boolean
  notifBudget?: boolean
}

/**
 * The active reaction after clicking `clicked`, given the user's previous one.
 * Clicking the same reaction clears it (toggle); clicking a different one switches.
 * Mirrors `record_reaction` in supabase/upgrade-phase1.sql.
 */
export function nextReaction(existing: ReactionKey | undefined, clicked: ReactionKey): ReactionKey | null {
  if (existing === clicked) return null
  return clicked
}

/**
 * Whether a user with `prefs` should receive a notification of `type`.
 * Defaults to true (notify) unless the user explicitly disabled that type.
 * Mirrors `should_notify` in supabase/upgrade-phase1.sql.
 */
export function wantsNotification(prefs: NotifPrefs | null | undefined, type: string): boolean {
  if (type === 'budget') return prefs?.notifBudget !== false
  if (type === 'update' || type === 'resolved' || type === 'alert' || type === 'event' || type === 'reply') {
    return prefs?.notifPush !== false
  }
  return true
}
