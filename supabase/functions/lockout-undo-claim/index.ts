import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

// Game must still be 'active' -- once it's ended, undoing a claim could
// contest an already-decided bingo/majority/sudden-death win.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'undo-claim', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await req.json()
    const { game_id, cell_id } = body as { game_id?: string; cell_id?: string }
    if (!game_id || !cell_id) return json({ error: 'game_id and cell_id are required.' }, 400)

    const { data: game } = await admin.from('games').select('status').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.status !== 'active') return json({ error: 'Game is not currently active.' }, 400)

    const { data: player } = await admin
      .from('players')
      .select('id, team_id')
      .eq('game_id', game_id)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!player) return json({ error: 'You are not a player in this game.' }, 403)
    if (!player.team_id) return json({ error: 'You are not on a team.' }, 400)

    // Atomic guard: only the claiming team can undo their own claim.
    const { data: cell, error: updateError } = await admin
      .from('lockout_cells')
      .update({ claimed_by_team_id: null, claimed_by_player_id: null, claimed_at: null })
      .eq('id', cell_id)
      .eq('game_id', game_id)
      .eq('claimed_by_team_id', player.team_id)
      .select()
      .maybeSingle()
    if (updateError) return json({ error: updateError.message }, 500)
    if (!cell) return json({ error: 'That cell is not claimed by your team.' }, 409)

    return json({ cell })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
