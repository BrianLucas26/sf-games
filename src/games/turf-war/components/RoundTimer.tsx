import { useEffect, useState } from 'react'
import { formatCountdown, secondsUntil } from '@/lib/time'

interface RoundTimerProps {
  roundEndsAt: string
  gameEnded: boolean
}

// Under five minutes the clock turns urgent -- long enough to still walk
// somewhere and claim it, short enough that you should be picking closer zones.
const URGENT_SECONDS = 5 * 60

export function RoundTimer({ roundEndsAt, gameEnded }: RoundTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(roundEndsAt))

  useEffect(() => {
    if (gameEnded) return
    setSecondsLeft(secondsUntil(roundEndsAt))
    const interval = setInterval(() => setSecondsLeft(secondsUntil(roundEndsAt)), 1000)
    return () => clearInterval(interval)
  }, [roundEndsAt, gameEnded])

  if (gameEnded) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Round over</h3>
        <p className="mt-1 text-sm text-muted">Final standings below.</p>
      </div>
    )
  }

  const expired = secondsLeft === 0
  const urgent = secondsLeft <= URGENT_SECONDS

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Time left</h3>
      {expired ? (
        // The round is ended server-side by the turf_war_tick() pg_cron sweep,
        // which runs once a minute -- there's no client fast path for it the
        // way there is for discard proposals, so say so instead of sitting on
        // a frozen 0:00.
        <p className="mt-1 text-sm text-muted">Time's up -- finishing up the final scores…</p>
      ) : (
        <p
          className={`mt-1 font-display text-2xl tabular-nums ${urgent ? 'text-danger' : 'text-ink'}`}
        >
          {formatCountdown(secondsLeft)}
        </p>
      )}
    </div>
  )
}
