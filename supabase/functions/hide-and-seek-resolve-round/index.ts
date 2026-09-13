import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import { HttpError, loadRoundContext, readBody } from '../_shared/hideAndSeek.ts'

// Client fast path for the seek cap: whoever's countdown hits zero first
// calls this instead of waiting up to a minute for hide_and_seek_tick().
// hide_and_seek_finish_round() re-checks the deadline itself, so an early
// call (client clock skew) is a harmless no-op the client just retries.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-resolve-round', 40))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const { game_id } = await readBody<{ game_id: string }>(req)
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const { round } = await loadRoundContext(admin, game_id, user.id)
    if (round.status !== 'active') return json({ skipped: true })

    const { error } = await admin.rpc('hide_and_seek_finish_round', {
      p_round_id: round.id,
      p_reason: 'time_cap',
    })
    if (error) return json({ error: error.message }, 500)

    const { data: after } = await admin.from('hide_and_seek_rounds').select('status').eq('id', round.id).single()
    return json({ skipped: after?.status !== 'completed' })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
