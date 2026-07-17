import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { TurfWarStandingsRow } from '../types'

// refreshKey is anything that changes when zones change (the board passes its
// zones array) -- standings are a Postgres RPC, not recomputed client-side.
export function useTurfWarStandings(gameId: string, refreshKey: unknown) {
  const [standings, setStandings] = useState<TurfWarStandingsRow[]>([])

  useEffect(() => {
    let cancelled = false
    supabase
      .rpc('turf_war_team_standings', { p_game_id: gameId })
      .then(({ data }) => {
        if (!cancelled && data) setStandings(data)
      })
    return () => {
      cancelled = true
    }
  }, [gameId, refreshKey])

  return standings
}
