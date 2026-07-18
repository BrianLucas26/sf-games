import { callFunction } from '@/lib/functions'
import type { GameRow } from '@/types/database'
import type { LockoutCellRow, LockoutGameStateRow } from './types'

export function startLockout(gameId: string) {
  return callFunction<{ game: GameRow }>('lockout-start', { game_id: gameId })
}

export function claimCell(params: { gameId: string; cellId: string }) {
  return callFunction<{ cell: LockoutCellRow; won: boolean; winnerTeamId: string | null }>(
    'lockout-claim-cell',
    { game_id: params.gameId, cell_id: params.cellId },
  )
}

export function undoClaim(params: { gameId: string; cellId: string }) {
  return callFunction<{ cell: LockoutCellRow }>('lockout-undo-claim', {
    game_id: params.gameId,
    cell_id: params.cellId,
  })
}

export function resolveGame(gameId: string) {
  return callFunction<{ game: GameRow; gameState: LockoutGameStateRow }>('lockout-resolve-game', {
    game_id: gameId,
  })
}
