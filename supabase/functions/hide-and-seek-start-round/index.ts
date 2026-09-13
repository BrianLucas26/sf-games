import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { createRound, HttpError, loadRoundContext, readBody } from '../_shared/hideAndSeek.ts'

// Starts the next round once the previous one has ended: teams swap sides and
// the new hiding period starts immediately. Any player can press it -- in
// practice the new hiders, once they're ready to run. Not automatic, since
// both teams usually need a few minutes to regroup after a find.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-start-round', 10))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const { game_id } = await readBody<{ game_id: string }>(req)
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const { round: previous } = await loadRoundContext(admin, game_id, user.id)
    if (previous.status !== 'completed') return json({ error: 'The current round is still going.' }, 400)

    const { data: gameState } = await admin
      .from('hide_and_seek_game_state')
      .select('*')
      .eq('game_id', game_id)
      .single()
    if (!gameState) return json({ error: 'Game state not found.' }, 500)
    if (previous.round_number >= gameState.total_rounds) {
      return json({ error: 'That was the last round.' }, 400)
    }

    const round = await createRound(admin, {
      gameId: game_id,
      roundNumber: previous.round_number + 1,
      hiderTeamId: previous.seeker_team_id,
      seekerTeamId: previous.hider_team_id,
      hidingPeriodMinutes: gameState.hiding_period_minutes,
      maxSeekMinutes: gameState.max_seek_minutes,
    })
    // Someone else started it a moment earlier -- same outcome either way.
    if (!round) return json({ ok: true })

    await admin
      .from('hide_and_seek_game_state')
      .update({ current_round: round.round_number })
      .eq('game_id', game_id)

    return json({ round })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
