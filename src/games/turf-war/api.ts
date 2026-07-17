import { callFunction } from '@/lib/functions'
import type { GameRow } from '@/types/database'
import type { TurfWarCaptureRow, TurfWarDiscardProposalRow, TurfWarZoneRow } from './types'

export function startTurfWar(gameId: string) {
  return callFunction<{ game: GameRow }>('turf-war-start', { game_id: gameId })
}

export function claimZone(params: {
  gameId: string
  zoneId: string
  lat?: number
  lng?: number
  photoUrl?: string
}) {
  return callFunction<{ zone: TurfWarZoneRow; capture: TurfWarCaptureRow }>('turf-war-claim-zone', {
    game_id: params.gameId,
    zone_id: params.zoneId,
    lat: params.lat,
    lng: params.lng,
    photo_url: params.photoUrl,
  })
}

export function proposeDiscard(params: { gameId: string; captureId: string; targetZoneId: string }) {
  return callFunction<{ proposal: TurfWarDiscardProposalRow; vetoable: boolean }>(
    'turf-war-propose-discard',
    {
      game_id: params.gameId,
      capture_id: params.captureId,
      target_zone_id: params.targetZoneId,
    },
  )
}

export function vetoDiscard(proposalId: string) {
  return callFunction<{ proposal: TurfWarDiscardProposalRow }>('turf-war-veto-discard', {
    proposal_id: proposalId,
  })
}

export function resolveDiscard(proposalId: string) {
  return callFunction<{ proposal: TurfWarDiscardProposalRow; applied: boolean }>(
    'turf-war-resolve-discard',
    { proposal_id: proposalId },
  )
}
