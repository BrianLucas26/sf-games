import { useEffect, useState } from 'react'

// Returns a counter that increments whenever the page comes back to the
// foreground (tab switch, phone unlock, app switch) or the network returns.
//
// Why this is needed: mobile browsers freeze a backgrounded page and the OS
// closes its WebSocket, so a realtime channel comes back either dead or --
// worse -- reporting OPEN while actually being a zombie that only gets noticed
// on the next heartbeat (25s in realtime-js). Put this in a realtime effect's
// dep array so the effect tears the channel down and rebuilds it on resume;
// rebuilding is what actually works, since RealtimeChannel.subscribe()
// early-returns unless the channel is already closed.
//
// This only forces the reconnect. The refetch rides along with it: the
// subscribe() callback fires SUBSCRIBED again on the new join, and that is
// where each hook does its loading.
export function useResumeEpoch() {
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const bump = () => setEpoch((n) => n + 1)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') bump()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    // pageshow covers a bfcache restore (back/forward), where visibilitychange
    // isn't reliably delivered on iOS Safari.
    window.addEventListener('pageshow', onVisibilityChange)
    window.addEventListener('online', bump)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onVisibilityChange)
      window.removeEventListener('online', bump)
    }
  }, [])

  return epoch
}
