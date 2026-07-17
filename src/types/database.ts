// Hand-maintained mirror of the generic lobby schema in supabase/migrations.
// Regenerate/replace with `supabase gen types typescript` once the project is linked.

export type GameStatus = 'lobby' | 'active' | 'completed' | 'cancelled'

export interface GameTypeRow {
  id: string
  slug: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface GameRow {
  id: string
  game_type_id: string
  join_code: string
  status: GameStatus
  host_id: string | null
  settings: Record<string, unknown>
  created_at: string
  started_at: string | null
  ended_at: string | null
}

export interface TeamRow {
  id: string
  game_id: string
  name: string
  color: string | null
  created_at: string
}

export interface PlayerRow {
  id: string
  game_id: string
  team_id: string | null
  display_name: string
  is_host: boolean
  auth_user_id: string | null
  joined_at: string
}
