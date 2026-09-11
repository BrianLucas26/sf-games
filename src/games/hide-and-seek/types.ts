// Mirrors supabase/migrations/0037_hide_and_seek_schema.sql.

export type HideAndSeekWinCondition = 'total_time' | 'longest_single'
export type HideAndSeekRole = 'hider' | 'seeker'

export interface HideAndSeekGameStateRow {
  game_id: string
  hiding_period_minutes: number
  total_rounds: number
  max_seek_minutes: number
  hand_limit: number
  win_condition: HideAndSeekWinCondition
  current_round: number
  winner_team_id: string | null
  ended_reason: HideAndSeekWinCondition | 'tie' | null
}

export interface HideAndSeekRoundRow {
  id: string
  game_id: string
  round_number: number
  hider_team_id: string
  seeker_team_id: string
  status: 'active' | 'completed'
  hiding_started_at: string
  hiding_ends_at: string
  seek_ends_at: string | null
  found_claimed_at: string | null
  found_claimed_by_player_id: string | null
  ended_at: string | null
  end_reason: 'found' | 'time_cap' | null
  hide_seconds: number | null
}

export interface HideAndSeekQuestionRow {
  id: string
  game_id: string
  round_id: string
  question_key: string
  category: string
  prompt: string
  answer_options: string[] | null
  draw_count: number
  keep_count: number
  asked_by_player_id: string | null
  asked_at: string
  asked_from_lat: number | null
  asked_from_lng: number | null
  answer: string | null
  answered_by_player_id: string | null
  answered_at: string | null
}

export interface HideAndSeekCurseOfferRow {
  id: string
  game_id: string
  round_id: string
  team_id: string
  question_id: string | null
  keep_count: number
  created_at: string
  resolved_at: string | null
}

export interface HideAndSeekHandCardRow {
  id: string
  game_id: string
  round_id: string
  team_id: string
  curse_key: string
  name: string
  description: string
  duration_minutes: number | null
  blocks_questions: boolean
  status: 'offered' | 'held' | 'played' | 'discarded'
  offer_id: string | null
  drawn_at: string
}

export interface HideAndSeekActiveCurseRow {
  id: string
  game_id: string
  round_id: string
  curse_key: string
  name: string
  description: string
  duration_minutes: number | null
  blocks_questions: boolean
  played_by_player_id: string | null
  played_at: string
  expires_at: string | null
  cleared_at: string | null
  cleared_by_player_id: string | null
}

// --- Map markup. Validated server-side by hide-and-seek-map-marks. ---

export type LngLat = [number, number]
export type RegionSetKey = 'neighborhoods' | 'districts'

export type MarkData =
  | { kind: 'half_plane'; data: { a: LngLat; b: LngLat; side: 'left' | 'right' } }
  | { kind: 'circle'; data: { center: LngLat; radius_km: number; shade: 'inside' | 'outside' } }
  | { kind: 'freehand'; data: { points: LngLat[] } }
  | { kind: 'pin'; data: { at: LngLat; label: string } }
  | { kind: 'region'; data: { region_set: RegionSetKey; region_id: string; name: string } }

export type MarkKind = MarkData['kind']

export type HideAndSeekMapMarkRow = MarkData & {
  id: string
  game_id: string
  round_id: string
  team_id: string
  created_by_player_id: string | null
  created_at: string
  deleted_at: string | null
}

// The shape stored in games.settings when game_type = 'hide-and-seek'.
export interface HideAndSeekSettings {
  hiding_period_minutes: number
  rounds_per_team: number
  max_seek_minutes: number // 0 = no limit
  hand_limit: number
  win_condition: HideAndSeekWinCondition
}

export const DEFAULT_HIDE_AND_SEEK_SETTINGS: HideAndSeekSettings = {
  hiding_period_minutes: 30,
  rounds_per_team: 1,
  max_seek_minutes: 0,
  hand_limit: 6,
  win_condition: 'total_time',
}

// A curse is active until it's cleared (task curses) or its time runs out.
export function isCurseActive(curse: HideAndSeekActiveCurseRow, now: number): boolean {
  if (curse.cleared_at) return false
  return !curse.expires_at || new Date(curse.expires_at).getTime() > now
}
