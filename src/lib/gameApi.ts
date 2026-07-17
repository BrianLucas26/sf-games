import { callFunction } from './functions'
import type { GameRow, PlayerRow, TeamRow } from '@/types/database'

// Wrappers for the generic (game-type-agnostic) edge functions. Any
// game-specific action (e.g. turf-war-start) lives in that game's own api.ts.

export function createGame(params: {
  gameTypeSlug: string
  hostDisplayName: string
  teamNames?: string[]
  settings?: object
}) {
  return callFunction<{ game: GameRow; teams: TeamRow[]; player: PlayerRow }>('create-game', {
    game_type_slug: params.gameTypeSlug,
    host_display_name: params.hostDisplayName,
    team_names: params.teamNames,
    settings: params.settings,
  })
}

export function joinGame(params: { joinCode: string; displayName: string }) {
  return callFunction<{ game: GameRow; player: PlayerRow }>('join-game', {
    join_code: params.joinCode,
    display_name: params.displayName,
  })
}

export function selectTeam(params: { gameId: string; teamId: string }) {
  return callFunction<{ player: PlayerRow }>('select-team', {
    game_id: params.gameId,
    team_id: params.teamId,
  })
}

export function updateGameSettings(params: { gameId: string; settings: object }) {
  return callFunction<{ game: GameRow }>('update-game-settings', {
    game_id: params.gameId,
    settings: params.settings,
  })
}
