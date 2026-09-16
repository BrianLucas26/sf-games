// Countdown helpers shared across games -- nothing game-specific lives here.

export function secondsUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000))
}

// "M:SS" for short rounds, "H:MM:SS" once an hour or more is left -- turf war
// rounds default to 3 hours, where a bare minute count reads as noise.
export function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
