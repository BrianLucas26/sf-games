import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface SecretZoneRow {
  id: string
  zone_id: string
  assigned_at: string
  claimed_at: string | null
}

// RLS on turf_war_secret_zones only returns rows for the caller's own team,
// so this select is naturally private -- no client-side filtering needed.
// Shared by SecretZonePanel (the list) and Board (the map needs the same
// zone ids to paint them faintly) so there's exactly one fetch, not two.
export function useMySecretZones(gameId: string, teamId: string | undefined) {
  const [secrets, setSecrets] = useState<SecretZoneRow[]>([])

  useEffect(() => {
    if (!teamId) {
      setSecrets([])
      return
    }

    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('turf_war_secret_zones')
        .select('*')
        .eq('game_id', gameId)
        .eq('team_id', teamId)
        .is('claimed_at', null)
      if (!cancelled && data) setSecrets(data)
    }

    load()
    const channel = supabase
      .channel(`turf-war-secrets-${gameId}-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'turf_war_secret_zones', filter: `game_id=eq.${gameId}` },
        load,
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [gameId, teamId])

  return secrets
}
