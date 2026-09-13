import { useEffect, useState } from 'react'

// Re-renders the caller every `intervalMs` with the current timestamp, so
// any number of countdowns/elapsed clocks on one screen can derive from a
// single ticking value instead of each owning its own setInterval.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return now
}
