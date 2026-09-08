import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useResumeEpoch } from '@/hooks/useResumeEpoch'
import type { RegionRow } from '@/types/geo'
import type { TurfWarDiscardProposalRow, TurfWarZoneRow } from '../types'

export interface ZoneWithRegion extends TurfWarZoneRow {
  region: RegionRow
}

export interface ProposalWithCapture extends TurfWarDiscardProposalRow {
  capture: { team_id: string; zone_id: string }
}

// Subscribes to the two tables the board needs live: zone status/ownership
// (for the map + scoreboard) and pending discard proposals (for the veto
// banner). Both refetch on any change rather than patch state locally --
// simple, and the tables are small enough that a full refetch is cheap.
export function useTurfWarRealtime(gameId: string) {
  const [zones, setZones] = useState<ZoneWithRegion[]>([])
  const [proposals, setProposals] = useState<ProposalWithCapture[]>([])
  const [loading, setLoading] = useState(true)
  const resumeEpoch = useResumeEpoch()

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
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        // Fires on the first join AND on every automatic rejoin, so this is
        // both the initial load and the reconnect resync -- postgres_changes
        // never replays what was missed while the socket was down. See
        // useResumeEpoch for why the channel is rebuilt on foreground.
        Promise.all([loadZones(), loadProposals()]).then(() => {
          if (!cancelled) setLoading(false)
        })
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [gameId, resumeEpoch])

  return { zones, proposals, loading }
}
