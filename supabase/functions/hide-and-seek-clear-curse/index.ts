import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import {
  HttpError,
  loadRoundContext,
  readBody,
  requireActiveRound,
  requireRole,
} from '../_shared/hideAndSeek.ts'

// Seekers mark a curse as done. Only 'task' and 'deadline' curses can be
// cleared this way: a 'timer' curse runs out on its own, and a 'round' curse
// stands until the round ends.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-clear-curse', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const { game_id, active_curse_id } = await readBody<{ game_id: string; active_curse_id: string }>(req)
    if (!game_id || !active_curse_id) return json({ error: 'game_id and active_curse_id are required.' }, 400)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'seeker')
    requireActiveRound(ctx.round)

    const { data: curse } = await admin
      .from('hide_and_seek_active_curses')
      .select('clear_mode, cleared_at')
      .eq('id', active_curse_id)
      .eq('round_id', ctx.round.id)
      .maybeSingle()
    if (!curse) return json({ error: 'Curse not found.' }, 404)
    if (curse.clear_mode === 'timer') {
      return json({ error: 'Timed curses clear themselves when time is up.' }, 400)
    }
    if (curse.clear_mode === 'round') {
      return json({ error: 'This curse stands for the rest of the round.' }, 400)
    }

    const { data: cleared } = await admin
      .from('hide_and_seek_active_curses')
      .update({ cleared_at: new Date().toISOString(), cleared_by_player_id: ctx.player.id })
      .eq('id', active_curse_id)
      .is('cleared_at', null)
      .select()
      .maybeSingle()
    if (!cleared) return json({ error: 'That curse was already cleared.' }, 409)

    return json({ curse: cleared })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
