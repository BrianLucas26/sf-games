import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import type { TeamRow } from '@/types/database'
import { DiscardPicker } from './components/DiscardPicker'
import { Scoreboard } from './components/Scoreboard'
import { SecretZonePanel } from './components/SecretZonePanel'
import { VetoBanner } from './components/VetoBanner'
import { ZoneDetailPanel } from './components/ZoneDetailPanel'
import { ZoneMap } from './components/ZoneMap'
import { useTurfWarRealtime, type ZoneWithRegion } from './hooks/useTurfWarRealtime'
import { useTurfWarStandings } from './hooks/useTurfWarStandings'
import type { TurfWarCaptureRow, TurfWarVerificationMode } from './types'

const TEAM_COLORS = ['#ef4444', '#3b82f6']

export function Board({ gameId }: { gameId: string }) {
  const { player } = useCurrentPlayer(gameId)
  const { zones, proposals, loading } = useTurfWarRealtime(gameId)
  const standings = useTurfWarStandings(gameId, zones)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [challengeByRegionId, setChallengeByRegionId] = useState<Record<string, string>>({})
  const [verificationMode, setVerificationMode] = useState<TurfWarVerificationMode>('none')
  const [selectedZone, setSelectedZone] = useState<ZoneWithRegion | null>(null)
  const [pendingCapture, setPendingCapture] = useState<TurfWarCaptureRow | null>(null)

  useEffect(() => {
    supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at')
      .then(({ data }) => data && setTeams(data))

    supabase
      .from('turf_war_challenges')
      .select('*')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const row of data) map[row.region_id] = row.prompt
        setChallengeByRegionId(map)
      })

    supabase
      .from('turf_war_game_state')
      .select('verification_mode')
      .eq('game_id', gameId)
      .single()
      .then(({ data }) => data && setVerificationMode(data.verification_mode))
  }, [gameId])

  const teamColorById = useMemo(() => {
    const map: Record<string, string> = {}
    teams.forEach((t, i) => {
      map[t.id] = TEAM_COLORS[i % TEAM_COLORS.length]
    })
    return map
  }, [teams])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading board...</p>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <ZoneMap zones={zones} teamColorById={teamColorById} onZoneClick={setSelectedZone} />

      <div className="space-y-4">
        <Scoreboard standings={standings} teams={teams} teamColorById={teamColorById} />

        {player?.team_id && (
          <SecretZonePanel gameId={gameId} teamId={player.team_id} zones={zones} />
        )}

        {selectedZone && player && (
          <ZoneDetailPanel
            zone={selectedZone}
            challenge={challengeByRegionId[selectedZone.region.id]}
            player={player}
            verificationMode={verificationMode}
            onClose={() => setSelectedZone(null)}
            onClaimed={(capture) => {
              setPendingCapture(capture)
              setSelectedZone(null)
            }}
          />
        )}

        {pendingCapture && (
          <DiscardPicker
            gameId={gameId}
            capture={pendingCapture}
            openZones={zones.filter((z) => z.status === 'open')}
            onDone={() => setPendingCapture(null)}
          />
        )}

        {proposals.map((proposal) => (
          <VetoBanner key={proposal.id} proposal={proposal} player={player} zones={zones} />
        ))}
      </div>
    </div>
  )
}
