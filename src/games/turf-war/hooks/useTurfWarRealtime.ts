import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { GameStatus } from '@/types/database'
import type { RegionRow } from '@/types/geo'
import type { TurfWarDiscardProposalRow, TurfWarGameStateRow, TurfWarZoneRow } from '../types'

export interface ZoneWithRegion extends TurfWarZoneRow {
  region: RegionRow
}

export interface ProposalWithCapture extends TurfWarDiscardProposalRow {
  capture: { team_id: string; zone_id: string }
}

// Subscribes to the three things the board needs live: zone status/ownership
// (for the map + scoreboard), pending discard proposals (for the veto banner),
// and the game's own status (so the board flips to "round over" the moment
// turf_war_tick() completes the game). These refetch on any change rather than
// patch state locally -- simple, and the tables are small enough that a full
// refetch is cheap.
//
// turf_war_game_state is loaded rather than subscribed: it isn't in the
// realtime publication (see 0008). verification_mode and round_ends_at are
// fixed when the round starts, but last_secret_tick_at moves every time
// turf_war_tick() hands out secret neighborhoods -- so refreshGameState is
// returned for the next-secret countdown to re-read it when one is due.
export function useTurfWarRealtime(gameId: string) {
  const [zones, setZones] = useState<ZoneWithRegion[]>([])
  const [proposals, setProposals] = useState<ProposalWithCapture[]>([])
  const [gameState, setGameState] = useState<TurfWarGameStateRow | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadGameState = useCallback(async () => {
    const { data } = await supabase
      .from('turf_war_game_state')
      .select('*')
      .eq('game_id', gameId)
      .maybeSingle()
    if (data) setGameState(data)
  }, [gameId])

  useEffect(() => {
    let cancelled = false

    async function loadZones() {
      const { data } = await supabase
        .from('turf_war_zones')
        .select('*, region:map_regions(*)')
        .eq('game_id', gameId)
      if (!cancelled && data) setZones(data as unknown as ZoneWithRegion[])
    }

    async function loadProposals() {
      const { data } = await supabase
        .from('turf_war_discard_proposals')
        .select('*, capture:turf_war_captures(team_id, zone_id)')
        .eq('game_id', gameId)
        .eq('status', 'pending')
      if (!cancelled && data) setProposals(data as unknown as ProposalWithCapture[])
    }

    async function loadGameStatus() {
      const { data } = await supabase.from('games').select('status').eq('id', gameId).maybeSingle()
      if (!cancelled && data) setGameStatus(data.status)
    }

    Promise.all([loadZones(), loadProposals(), loadGameState(), loadGameStatus()]).then(() => {
      if (!cancelled) setLoading(false)
    })

    const channel = supabase
      .channel(`turf-war-board-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'turf_war_zones', filter: `game_id=eq.${gameId}` },
        loadZones,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turf_war_discard_proposals',
          filter: `game_id=eq.${gameId}`,
        },
        loadProposals,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        loadGameStatus,
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [gameId, loadGameState])

  return { zones, proposals, gameState, gameStatus, loading, refreshGameState: loadGameState }
}
