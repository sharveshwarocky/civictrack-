/** Real geolocation helpers (navigator.geolocation with a safety timeout). */

export interface Coords {
  lat: number
  lng: number
}

function getPositionRaw(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    })
  })
}

/** Resolves to coordinates or null on failure/timeout — never throws. */
export async function getCurrentCoords(timeoutMs = 12000): Promise<Coords | null> {
  try {
    const pos = await Promise.race([
      getPositionRaw(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ])
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    return null
  }
}

/** Nicely formatted coordinate label, e.g. 13.08780° N, 80.21010° E */
export function fmtCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`
}
