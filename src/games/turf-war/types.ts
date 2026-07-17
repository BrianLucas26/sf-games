// Mirrors supabase/migrations/0003_turf_war.sql.

export type TurfWarZoneStatus = 'locked' | 'open' | 'claimed' | 'discarded'
export type TurfWarVerificationMode = 'none' | 'gps' | 'gps_photo'
export type TurfWarDiscardStatus = 'pending' | 'vetoed' | 'applied'

export interface TurfWarZoneRow {
  id: string
  game_id: string
  region_id: string
  status: TurfWarZoneStatus
  owning_team_id: string | null
  draw_position: number
  opened_at: string | null
  claimed_at: string | null
  discarded_at: string | null
}

export interface TurfWarCaptureRow {
  id: string
  game_id: string
  zone_id: string
  team_id: string
  player_id: string
  verification_mode: TurfWarVerificationMode
  submitted_lat: number | null
  submitted_lng: number | null
  distance_meters: number | null
  photo_url: string | null
  created_at: string
}

export interface TurfWarDiscardProposalRow {
  id: string
  game_id: string
  capture_id: string
  target_zone_id: string
  status: TurfWarDiscardStatus
  proposed_at: string
  expires_at: string
  resolved_at: string | null
  veto_by_player_id: string | null
}

export interface TurfWarSecretZoneRow {
  id: string
  game_id: string
  team_id: string
  zone_id: string
  assigned_at: string
  claimed_at: string | null
}

export interface TurfWarGameStateRow {
  game_id: string
  open_slot_target: number
  secret_interval_minutes: number
  verification_mode: TurfWarVerificationMode
  gps_threshold_meters: number | null
  round_ends_at: string
  last_secret_tick_at: string
}

export interface TurfWarStandingsRow {
  team_id: string
  claimed_count: number
  largest_cluster_size: number
}

// The shape stored in games.settings when game_type = 'turf-war'.
export interface TurfWarSettings {
  open_slot_target: number
  secret_interval_minutes: number
  duration_minutes: number
  verification_mode: TurfWarVerificationMode
  gps_threshold_meters: number | null
}

export const DEFAULT_TURF_WAR_SETTINGS: TurfWarSettings = {
  open_slot_target: 5,
  secret_interval_minutes: 15,
  duration_minutes: 180,
  verification_mode: 'none',
  gps_threshold_meters: 100,
}
