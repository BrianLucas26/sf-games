import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { createRound, fullDeckKeys, HttpError, readBody } from '../_shared/hideAndSeek.ts'

interface HideAndSeekSettings {
  hiding_period_minutes: number
  rounds_per_team: number
  max_seek_minutes: number
  hand_limit: number
  win_condition: 'total_time' | 'longest_single'
}

const DEFAULTS: HideAndSeekSettings = {
  hiding_period_minutes: 30,
  rounds_per_team: 1,
  max_seek_minutes: 0,
  hand_limit: 6,
  win_condition: 'total_time',
}

function isWholeNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

// Host-only: snapshots the lobby settings into hide_and_seek_game_state,
// creates round 1 (the first team by position hides first) with its fresh
// curse deck, and flips the game to 'active'. Enforces exactly 2 teams here
// (a Hide and Seek rule, not a `teams` table constraint), matching
// lockout-start's convention.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const { game_id } = await readBody<{ game_id: string }>(req)
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game } = await admin.from('games').select('*').eq('id', game_id).maybeSingle()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.host_id !== user.id) return json({ error: 'Only the host can start the game.' }, 403)
    if (game.status !== 'lobby') return json({ error: 'Game has already started.' }, 400)

    const { data: teams, error: teamsError } = await admin
      .from('teams')
      .select('id')
      .eq('game_id', game_id)
      .order('position')
    if (teamsError) return json({ error: teamsError.message }, 500)
    if (!teams || teams.length !== 2) {
      return json({ error: 'Hide and Seek requires exactly 2 teams.' }, 400)
    }

    const settings: HideAndSeekSettings = { ...DEFAULTS, ...(game.settings ?? {}) }
    if (!isWholeNumberInRange(settings.hiding_period_minutes, 1, 240)) {
      return json({ error: 'Hiding period must be between 1 and 240 minutes.' }, 400)
    }
    if (!isWholeNumberInRange(settings.rounds_per_team, 1, 5)) {
      return json({ error: 'Rounds per team must be between 1 and 5.' }, 400)
    }
    if (!isWholeNumberInRange(settings.max_seek_minutes, 0, 600)) {
      return json({ error: 'Max seeking time must be between 0 (no limit) and 600 minutes.' }, 400)
    }
    if (!isWholeNumberInRange(settings.hand_limit, 1, 20)) {
      return json({ error: 'Hand limit must be between 1 and 20.' }, 400)
    }
    if (!['total_time', 'longest_single'].includes(settings.win_condition)) {
      return json({ error: 'Unknown win condition.' }, 400)
    }
    if (fullDeckKeys().length === 0) {
      return json({ error: 'The curse deck is empty -- add curses to content/hide-and-seek-curses.ts.' }, 500)
    }

    const { error: stateError } = await admin.from('hide_and_seek_game_state').insert({
      game_id,
      hiding_period_minutes: settings.hiding_period_minutes,
      total_rounds: settings.rounds_per_team * 2,
      max_seek_minutes: settings.max_seek_minutes,
      hand_limit: settings.hand_limit,
      win_condition: settings.win_condition,
      current_round: 1,
    })
    if (stateError) return json({ error: stateError.message }, 500)

    const round = await createRound(admin, {
      gameId: game_id,
      roundNumber: 1,
      hiderTeamId: teams[0].id,
      seekerTeamId: teams[1].id,
      hidingPeriodMinutes: settings.hiding_period_minutes,
      maxSeekMinutes: settings.max_seek_minutes,
    })
    if (!round) return json({ error: 'Round 1 already exists.' }, 409)

    const { data: updatedGame, error: updateGameError } = await admin
      .from('games')
      .update({ status: 'active', started_at: round.hiding_started_at })
      .eq('id', game_id)
      .select()
      .single()
    if (updateGameError || !updatedGame) {
      return json({ error: updateGameError?.message ?? 'Failed to start game' }, 500)
    }

    return json({ game: updatedGame })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
