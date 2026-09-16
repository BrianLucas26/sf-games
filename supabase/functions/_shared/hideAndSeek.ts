import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { HIDE_AND_SEEK_CURSES } from '../../../content/hide-and-seek-curses.ts'

// Hide-and-seek-only helpers shared by its ~10 edge functions -- every one of
// them needs the same "who is calling, which round is live, are they hiding
// or seeking" lookup, so it lives here once instead of being pasted into each.

// Thrown by the loaders below; each function's catch block turns it into a
// normal JSON error response.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface HideAndSeekRound {
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

export type HideAndSeekRole = 'hider' | 'seeker'

export interface RoundContext {
  player: { id: string; team_id: string }
  round: HideAndSeekRound
  role: HideAndSeekRole
}

// The caller's player row, the game's latest round, and which side of it the
// caller is on. Requires the game to be active.
export async function loadRoundContext(
  admin: SupabaseClient,
  gameId: string,
  userId: string,
): Promise<RoundContext> {
  const { data: game } = await admin.from('games').select('status').eq('id', gameId).maybeSingle()
  if (!game) throw new HttpError(404, 'Game not found.')
  if (game.status !== 'active') throw new HttpError(400, 'Game is not currently active.')

  const { data: player } = await admin
    .from('players')
    .select('id, team_id')
    .eq('game_id', gameId)
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (!player) throw new HttpError(403, 'You are not a player in this game.')
  if (!player.team_id) throw new HttpError(400, 'Join a team first.')

  const { data: round } = await admin
    .from('hide_and_seek_rounds')
    .select('*')
    .eq('game_id', gameId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!round) throw new HttpError(500, 'Round not found.')

  const role: HideAndSeekRole | null =
    player.team_id === round.hider_team_id ? 'hider' : player.team_id === round.seeker_team_id ? 'seeker' : null
  if (!role) throw new HttpError(403, 'Your team is not part of this round.')

  return { player: player as RoundContext['player'], round: round as HideAndSeekRound, role }
}

export function requireRole(ctx: RoundContext, role: HideAndSeekRole) {
  if (ctx.role !== role) {
    throw new HttpError(403, role === 'hider' ? 'Only the hiding team can do that.' : 'Only the seeking team can do that.')
  }
}

export function requireActiveRound(round: HideAndSeekRound) {
  if (round.status !== 'active') throw new HttpError(400, 'This round is over.')
}

export function requireSeekingStarted(round: HideAndSeekRound) {
  if (Date.now() < new Date(round.hiding_ends_at).getTime()) {
    throw new HttpError(400, 'The hiding period is still running.')
  }
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Every curse key in the deck, `copies` times each, unshuffled.
export function fullDeckKeys(): string[] {
  return HIDE_AND_SEEK_CURSES.flatMap((curse) => Array(curse.copies ?? 1).fill(curse.id))
}

// Creates a round (plus its fresh shuffled deck). Shared by hide-and-seek-start
// (round 1) and hide-and-seek-start-round (every round after). Returns null
// if that round number already exists -- two players tapping "start next
// round" at once, where the loser should just see the winner's round.
export async function createRound(
  admin: SupabaseClient,
  params: {
    gameId: string
    roundNumber: number
    hiderTeamId: string
    seekerTeamId: string
    hidingPeriodMinutes: number
    maxSeekMinutes: number
  },
): Promise<HideAndSeekRound | null> {
  const startedAt = new Date()
  const hidingEndsAt = new Date(startedAt.getTime() + params.hidingPeriodMinutes * 60_000)
  const seekEndsAt =
    params.maxSeekMinutes > 0 ? new Date(hidingEndsAt.getTime() + params.maxSeekMinutes * 60_000) : null

  const { data: round, error } = await admin
    .from('hide_and_seek_rounds')
    .insert({
      game_id: params.gameId,
      round_number: params.roundNumber,
      hider_team_id: params.hiderTeamId,
      seeker_team_id: params.seekerTeamId,
      hiding_started_at: startedAt.toISOString(),
      hiding_ends_at: hidingEndsAt.toISOString(),
      seek_ends_at: seekEndsAt?.toISOString() ?? null,
    })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') return null
    throw new HttpError(500, error.message)
  }

  const { error: deckError } = await admin
    .from('hide_and_seek_decks')
    .insert({ round_id: round.id, game_id: params.gameId, draw_pile: shuffle(fullDeckKeys()) })
  if (deckError) throw new HttpError(500, deckError.message)

  return round as HideAndSeekRound
}

// Only the fields a client ever sends in a request body -- keeps each
// function's destructuring honest about what it expects.
export async function readBody<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>
  } catch {
    throw new HttpError(400, 'Request body must be JSON.')
  }
}
