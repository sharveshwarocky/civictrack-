import { describe, expect, it } from 'vitest'
import { nextReaction, wantsNotification } from '../interactions'

describe('nextReaction', () => {
  it('activates a reaction when none is active', () => {
    expect(nextReaction(undefined, 'up')).toBe('up')
    expect(nextReaction(undefined, 'heart')).toBe('heart')
  })

  it('clears the reaction when clicking the same one again', () => {
    expect(nextReaction('up', 'up')).toBeNull()
    expect(nextReaction('heart', 'heart')).toBeNull()
  })

  it('switches when clicking a different reaction', () => {
    expect(nextReaction('up', 'heart')).toBe('heart')
    expect(nextReaction('down', 'up')).toBe('up')
  })
})

describe('wantsNotification', () => {
  it('notifies by default (no prefs saved)', () => {
    expect(wantsNotification(undefined, 'update')).toBe(true)
    expect(wantsNotification(null, 'budget')).toBe(true)
    expect(wantsNotification({}, 'resolved')).toBe(true)
  })

  it('respects the budget toggle for budget notifications', () => {
    expect(wantsNotification({ notifBudget: false }, 'budget')).toBe(false)
    expect(wantsNotification({ notifBudget: true }, 'budget')).toBe(true)
  })

  it('respects the push toggle for status notifications', () => {
    expect(wantsNotification({ notifPush: false }, 'update')).toBe(false)
    expect(wantsNotification({ notifPush: false }, 'resolved')).toBe(false)
    expect(wantsNotification({ notifPush: false }, 'alert')).toBe(false)
    expect(wantsNotification({ notifPush: true }, 'update')).toBe(true)
  })

  it('does not gate unknown notification types', () => {
    expect(wantsNotification({ notifPush: false, notifBudget: false }, 'weird')).toBe(true)
  })
})
