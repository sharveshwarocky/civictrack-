import type { Area } from './types'

/** Areas with real map centroids so geolocation can resolve the nearest one. */
export const AREAS: Area[] = [
  { id: 'anna-nagar', name: 'Anna Nagar', emoji: '🏘️', lat: 13.0878, lng: 80.2101 },
  { id: 't-nagar', name: 'T. Nagar', emoji: '🏬', lat: 13.0418, lng: 80.2341 },
  { id: 'velachery', name: 'Velachery', emoji: '🌳', lat: 12.9815, lng: 80.218 },
  { id: 'adyar', name: 'Adyar', emoji: '🏖️', lat: 13.0012, lng: 80.2565 },
  { id: 'besant-nagar', name: 'Besant Nagar', emoji: '🌊', lat: 12.9979, lng: 80.268 },
  { id: 'kilpauk', name: 'Kilpauk', emoji: '🏥', lat: 13.0735, lng: 80.24 },
  { id: 'madurai', name: 'Madurai', emoji: '🏛️', lat: 9.9252, lng: 78.1198 },
]

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

/** Nearest area name for a coordinate, or undefined if far from every centroid. */
export function areaFromCoords(lat: number, lng: number, maxKm = 60): string | undefined {
  let best: { name: string; km: number } | undefined
  for (const a of AREAS) {
    const km = haversineKm(lat, lng, a.lat, a.lng)
    if (!best || km < best.km) best = { name: a.name, km }
  }
  return best && best.km <= maxKm ? best.name : undefined
}
