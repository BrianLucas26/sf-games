import type { LngLat } from '../types'

// One-shot GPS fix as [lng, lat], or null if the browser can't/won't give one
// (permission denied, no signal, desktop without location). Callers treat
// location as a nice-to-have, never a requirement.
export function getCurrentLngLat(timeoutMs = 10_000): Promise<LngLat | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    )
  })
}
