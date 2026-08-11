import type { Area } from './types'
import { CITY_COORDS, type CityCoord } from './world-coords'

/** Chennai localities with real map centroids so geolocation resolves them first. */
export const AREAS: Area[] = [
  { id: 'anna-nagar', name: 'Anna Nagar', emoji: '🏘️', lat: 13.0878, lng: 80.2101 },
  { id: 't-nagar', name: 'T. Nagar', emoji: '🏬', lat: 13.0418, lng: 80.2341 },
  { id: 'velachery', name: 'Velachery', emoji: '🌳', lat: 12.9815, lng: 80.218 },
  { id: 'adyar', name: 'Adyar', emoji: '🏖️', lat: 13.0012, lng: 80.2565 },
  { id: 'besant-nagar', name: 'Besant Nagar', emoji: '🌊', lat: 12.9979, lng: 80.268 },
  { id: 'kilpauk', name: 'Kilpauk', emoji: '🏥', lat: 13.0735, lng: 80.24 },
  { id: 'madurai', name: 'Madurai', emoji: '🏛️', lat: 9.9252, lng: 78.1198 },
]

/** A city row from the bundled 33k-city dataset (name, country, subcountry). */
export type WorldCity = [name: string, country: string, subcountry: string]

let worldCache: WorldCity[] | null = null
let worldLoading: Promise<WorldCity[]> | null = null

/** Lazy-load the world city dataset (split into its own bundle, fetched on demand). */
export function loadWorldCities(): Promise<WorldCity[]> {
  if (worldCache) return Promise.resolve(worldCache)
  if (!worldLoading) {
    worldLoading = import('./world-cities.json')
      .then((mod) => {
        worldCache = mod.default as WorldCity[]
        return worldCache
      })
      .catch((err) => {
        worldLoading = null
        console.warn('world cities failed to load:', err)
        return []
      })
  }
  return worldLoading
}

export function getArea(name: string): Area | undefined {
  return AREAS.find((a) => a.name === name)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Nearest known city/locality for a coordinate, or null beyond maxKm. */
export function nearestKnownCity(lat: number, lng: number, maxKm = 200): CityCoord | null {
  let best: CityCoord | null = null
  let bestKm = Infinity
  for (const c of CITY_COORDS) {
    const km = haversineKm(lat, lng, c[2], c[3])
    if (km < bestKm) {
      bestKm = km
      best = c
    }
  }
  return best && bestKm <= maxKm ? best : null
}

/** Closest N cities to a coordinate, sorted by distance (for the "nearby" list). */
export function nearbyAreas(lat: number, lng: number, limit = 6): { name: string; country: string; km: number }[] {
  return CITY_COORDS.map((c) => ({ name: c[0], country: c[1], km: haversineKm(lat, lng, c[2], c[3]) }))
    .filter((c) => c.km <= 250)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
}

/** Best area label for a coordinate: Chennai locality first, then the nearest world city. */
export function resolveAreaName(lat: number, lng: number): string | undefined {
  // Prefer Chennai localities within 60 km (they win nearest matching).
  for (const a of AREAS) {
    const km = haversineKm(lat, lng, a.lat, a.lng)
    if (km <= 60) return a.name
  }
  const city = nearestKnownCity(lat, lng)
  return city?.[0]
}

/** Nearest area name for a coordinate (legacy compat — now world-aware). */
export function areaFromCoords(lat: number, lng: number, maxKm = 60): string | undefined {
  let best: { name: string; km: number } | undefined
  for (const a of AREAS) {
    const km = haversineKm(lat, lng, a.lat, a.lng)
    if (!best || km < best.km) best = { name: a.name, km }
  }
  if (best && best.km <= maxKm) return best.name
  return nearestKnownCity(lat, lng)?.[0]
}

/** Case-insensitive search across the full world dataset (name / country / region). */
export async function searchWorldLocations(q: string, limit = 50): Promise<WorldCity[]> {
  const term = q.trim().toLowerCase()
  if (!term) return []
  const all = await loadWorldCities()
  const out: WorldCity[] = []
  for (const c of all) {
    if (
      c[0].toLowerCase().includes(term) ||
      c[1].toLowerCase().includes(term) ||
      c[2].toLowerCase().includes(term)
    ) {
      out.push(c)
      if (out.length >= limit) break
    }
  }
  return out
}

// ---- recently used areas (device-local) ----
const RECENT_KEY = 'ct-recent-areas'

export function getRecentAreas(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function addRecentArea(name: string): void {
  try {
    const list = [name, ...getRecentAreas().filter((a) => a !== name)].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}
