import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

interface LockoutSettings {
  board_size: 3 | 4 | 5
  game_mode: 'bingo' | 'majority'
  tie_breaker: 'tie' | 'sudden_death' | 'first_to_score'
  duration_minutes: number
}

const DEFAULTS: LockoutSettings = {
  board_size: 4,
  game_mode: 'bingo',
  tie_breaker: 'sudden_death',
  duration_minutes: 60,
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Host-only: samples board_size^2 challenges, seeds lockout_cells in random
// positions, writes lockout_game_state, and flips the game to 'active'.
// Enforces exactly 2 teams here (a Lockout rule, not a `teams` table
// constraint), matching turf-war-start's convention.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id } = body as { game_id?: string }
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game, error: gameError } = await admin
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single()
    if (gameError || !game) return json({ error: 'Game not found.' }, 404)
    if (game.host_id !== user.id) return json({ error: 'Only the host can start the game.' }, 403)
    if (game.status !== 'lobby') return json({ error: 'Game has already started.' }, 400)

    const { data: teams, error: teamsError } = await admin
      .from('teams')
      .select('id')
      .eq('game_id', game_id)
    if (teamsError) return json({ error: teamsError.message }, 500)
    if (!teams || teams.length !== 2) {
      return json({ error: 'Lockout requires exactly 2 teams.' }, 400)
    }

    const settings: LockoutSettings = { ...DEFAULTS, ...(game.settings ?? {}) }
    if (![3, 4, 5].includes(settings.board_size)) {
      return json({ error: 'board_size must be 3, 4, or 5.' }, 400)
    }

    const cellCount = settings.board_size * settings.board_size

    const { data: challenges, error: challengesError } = await admin
      .from('lockout_challenges')
      .select('id')
      .eq('is_active', true)
    if (challengesError) return json({ error: challengesError.message }, 500)
    if (!challenges || challenges.length < cellCount) {
      return json(
        { error: `Not enough active challenges (${challenges?.length ?? 0}) for a ${settings.board_size}x${settings.board_size} board (${cellCount} needed).` },
        500,
      )
    }

    const selected = shuffle(challenges).slice(0, cellCount)
    const cellRows = selected.map((challenge, position) => ({
      game_id,
      position,
      challenge_id: challenge.id,
    }))

    const { error: insertCellsError } = await admin.from('lockout_cells').insert(cellRows)
    if (insertCellsError) return json({ error: insertCellsError.message }, 500)

    const startedAt = new Date()
    const roundEndsAt = new Date(startedAt.getTime() + settings.duration_minutes * 60_000)

    const { error: stateError } = await admin.from('lockout_game_state').insert({
      game_id,
      board_size: settings.board_size,
      game_mode: settings.game_mode,
      tie_breaker: settings.tie_breaker,
      round_ends_at: roundEndsAt.toISOString(),
    })
    if (stateError) return json({ error: stateError.message }, 500)

    const { data: updatedGame, error: updateGameError } = await admin
      .from('games')
      .update({ status: 'active', started_at: startedAt.toISOString() })
      .eq('id', game_id)
      .select()
      .single()
    if (updateGameError || !updatedGame) {
      return json({ error: updateGameError?.message ?? 'Failed to start game' }, 500)
    }

    return json({ game: updatedGame })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
