import { useEffect, useState } from 'react'
import { formatCountdown, secondsUntil } from '@/lib/time'

interface NextSecretTimerProps {
  lastTickAt: string
  intervalMinutes: number
  gameEnded: boolean
  // Re-reads turf_war_game_state so last_secret_tick_at moves on once the
  // sweep has run (the table isn't in the realtime publication).
  onDue: () => void
}

// turf_war_tick() only runs once a minute, so a secret lands somewhere in the
// minute after the interval elapses. Re-check at this cadence while we wait
// rather than hammering the row every second.
const DUE_POLL_MS = 5000

export function NextSecretTimer({ lastTickAt, intervalMinutes, gameEnded, onDue }: NextSecretTimerProps) {
  const nextAt = new Date(new Date(lastTickAt).getTime() + intervalMinutes * 60_000).toISOString()
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(nextAt))

  useEffect(() => {
    if (gameEnded) return
    setSecondsLeft(secondsUntil(nextAt))

    let lastPoll = 0
    const interval = setInterval(() => {
      const remaining = secondsUntil(nextAt)
      setSecondsLeft(remaining)
      if (remaining > 0) return
      // Keep polling instead of firing once: the sweep can be up to a minute
      // late, and a single attempt would leave this stuck on "any moment now".
      if (Date.now() - lastPoll < DUE_POLL_MS) return
      lastPoll = Date.now()
      onDue()
    }, 1000)
    return () => clearInterval(interval)
  }, [nextAt, gameEnded, onDue])

  if (gameEnded) return null

  return (
    <p className="px-1 text-xs text-muted">
      {secondsLeft === 0 ? (
        'Next secret neighborhood: any moment now…'
      ) : (
        <>
          Next secret neighborhood in{' '}
          <span className="font-display tabular-nums text-ink">{formatCountdown(secondsLeft)}</span>
        </>
      )}
    </p>
  )
}
