import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import type { TeamRow } from '@/types/database'
import { TURF_WAR_CHALLENGES } from '../../../content/turf-war-challenges'
import { DiscardPicker } from './components/DiscardPicker'
import { OpenZonesList } from './components/OpenZonesList'
import { PhotoDownloadButton } from './components/PhotoDownloadButton'
import { Scoreboard } from './components/Scoreboard'
import { SecretZonePanel } from './components/SecretZonePanel'
import { VetoBanner } from './components/VetoBanner'
import { ZoneDetailPanel } from './components/ZoneDetailPanel'
import { ZoneMap } from './components/ZoneMap'
import { useMySecretZones } from './hooks/useMySecretZones'
import { useTurfWarRealtime, type ZoneWithRegion } from './hooks/useTurfWarRealtime'
import { useTurfWarStandings } from './hooks/useTurfWarStandings'
import { TEAM_COLORS } from './theme'
import type { TurfWarCaptureRow, TurfWarVerificationMode } from './types'

export function Board({ gameId }: { gameId: string }) {
  const { player } = useCurrentPlayer(gameId)
  const { zones, proposals, loading } = useTurfWarRealtime(gameId)
  const standings = useTurfWarStandings(gameId, zones)
  const mySecrets = useMySecretZones(gameId, player?.team_id ?? undefined)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [verificationMode, setVerificationMode] = useState<TurfWarVerificationMode>('none')
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<ZoneWithRegion | null>(null)
  const [pendingCapture, setPendingCapture] = useState<TurfWarCaptureRow | null>(null)

  useEffect(() => {
    supabase
      .from('games')
      .select('join_code')
      .eq('id', gameId)
      .single()
      .then(({ data }) => data && setJoinCode(data.join_code))

    supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at')
      .then(({ data }) => data && setTeams(data))

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

  const mySecretZoneIds = useMemo(() => new Set(mySecrets.map((s) => s.zone_id)), [mySecrets])
  const myTeamColor = player?.team_id ? teamColorById[player.team_id] : undefined

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <ZoneMap
        zones={zones}
        teamColorById={teamColorById}
        mySecretZoneIds={mySecretZoneIds}
        myTeamColor={myTeamColor}
        onZoneClick={setSelectedZone}
      />

      <div className="space-y-4">
        <Scoreboard standings={standings} teams={teams} teamColorById={teamColorById} />

        <OpenZonesList zones={zones} onSelect={setSelectedZone} />

        {player?.team_id && (
          <SecretZonePanel secrets={mySecrets} zones={zones} onSelect={setSelectedZone} />
        )}

        {joinCode && <PhotoDownloadButton gameId={gameId} joinCode={joinCode} />}

        {selectedZone && player && (
          <ZoneDetailPanel
            zone={selectedZone}
            challenge={TURF_WAR_CHALLENGES[selectedZone.region.slug]}
            player={player}
            verificationMode={verificationMode}
            isMySecretZone={mySecretZoneIds.has(selectedZone.id)}
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
