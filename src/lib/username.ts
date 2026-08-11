/** Neutral English random usernames — citizens stay anonymous in feeds & chats. */

const ADJ = [
  'Swift', 'Bright', 'Calm', 'Brave', 'Quick', 'Gentle', 'Wise', 'Kind', 'Bold',
  'Sunny', 'Lucky', 'Zesty', 'Nimble', 'Merry', 'Steady', 'Mellow', 'Crisp',
  'Eager', 'Jolly', 'Placid', 'Sage', 'Vivid', 'Lively', 'Solid', 'Humble',
]

const NOUN = [
  'Otter', 'Heron', 'Sparrow', 'Falcon', 'Maple', 'River', 'Banyan', 'Mango',
  'Peacock', 'Tiger', 'Lotus', 'Coconut', 'Myna', 'Jackfruit', 'Sandal',
  'Marigold', 'Willow', 'Comet', 'Lantern', 'Horizon', 'Saffron', 'Cedar',
]

const COLORS = [
  '#00C853', '#2979FF', '#AA00FF', '#FF1744', '#FF9100', '#00BCD4', '#2ECC71',
  '#F39C12', '#E91E63', '#3F51B5', '#009688', '#795548', '#607D8B', '#8BC34A',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** A fresh, neutral, anonymous username, e.g. "SwiftOtter42". */
export function randomUsername(): string {
  return pick(ADJ) + pick(NOUN) + Math.floor(10 + Math.random() * 90)
}

/** Deterministic color for a username so an avatar stays stable per user. */
export function colorForSeed(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return COLORS[Math.abs(h) % COLORS.length]
}

/** Stable avatar color for a user id. */
export function colorForUserId(uid: string): string {
  return colorForSeed(uid)
}
