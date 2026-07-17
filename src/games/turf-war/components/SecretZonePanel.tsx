import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'

interface SecretZoneRow {
  id: string
  zone_id: string
  assigned_at: string
  claimed_at: string | null
}

interface SecretZonePanelProps {
  gameId: string
  teamId: string
  zones: ZoneWithRegion[]
}

// RLS on turf_war_secret_zones only returns rows for the caller's own team,
// so this select is naturally private -- no client-side filtering needed.
export function SecretZonePanel({ gameId, teamId, zones }: SecretZonePanelProps) {
  const [secrets, setSecrets] = useState<SecretZoneRow[]>([])

  useEffect(() => {
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

  if (secrets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 p-4 text-sm text-gray-500">
        No secret neighborhoods yet — your team gets one periodically.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-purple-800/50 bg-purple-950/20 p-4">
      <h3 className="text-sm font-semibold text-purple-300">Your secret neighborhoods</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {secrets.map((s) => {
          const zone = zones.find((z) => z.id === s.zone_id)
          return <li key={s.id}>{zone?.region.name ?? 'Unknown neighborhood'}</li>
        })}
      </ul>
    </div>
  )
}
