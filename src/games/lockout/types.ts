// Mirrors supabase/migrations/0017_lockout_schema.sql.

export type LockoutBoardSize = 3 | 4 | 5 | 6 | 7
export type LockoutGameMode = 'bingo' | 'majority' | 'combo'
export type LockoutTieBreaker = 'tie' | 'sudden_death' | 'first_to_score'
export type LockoutEndedReason =
  | 'bingo'
  | 'majority'
  | 'time_limit'
  | 'time_limit_tie'
  | 'time_limit_tiebreak'
  | 'sudden_death'

export interface LockoutCellRow {
  id: string
  game_id: string
  position: number
  prompt: string
  description: string | null
  claimed_by_team_id: string | null
  claimed_by_player_id: string | null
  claimed_at: string | null
}

export interface LockoutGameStateRow {
  game_id: string
  board_size: LockoutBoardSize
  game_mode: LockoutGameMode
  tie_breaker: LockoutTieBreaker
  round_ends_at: string
  sudden_death_active: boolean
  winner_team_id: string | null
  ended_reason: LockoutEndedReason | null
}

// The shape stored in games.settings when game_type = 'lockout'.
export interface LockoutSettings {
  board_size: LockoutBoardSize
  game_mode: LockoutGameMode
  tie_breaker: LockoutTieBreaker
  duration_minutes: number
}

export const DEFAULT_LOCKOUT_SETTINGS: LockoutSettings = {
  board_size: 5,
  game_mode: 'combo',
  tie_breaker: 'sudden_death',
  duration_minutes: 60,
}
