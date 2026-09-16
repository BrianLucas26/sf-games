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
  requireSeekingStarted,
} from '../_shared/hideAndSeek.ts'

type FoundAction = 'claim' | 'confirm' | 'reject'

// The end-of-round handshake:
//   claim   -- a seeker says "found them!"; the hide clock stops at this moment.
//   confirm -- a hider agrees; hide_and_seek_finish_round() ends the round
//              (and the game, if it was the last round).
//   reject  -- a hider says "not us", or a seeker withdraws the claim; the
//              clock resumes as if the claim never happened.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-found', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const { game_id, action } = await readBody<{ game_id: string; action: FoundAction }>(req)
    if (!game_id || !action) return json({ error: 'game_id and action are required.' }, 400)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireActiveRound(ctx.round)

    if (action === 'claim') {
      requireRole(ctx, 'seeker')
      requireSeekingStarted(ctx.round)
      const { data: round } = await admin
        .from('hide_and_seek_rounds')
        .update({ found_claimed_at: new Date().toISOString(), found_claimed_by_player_id: ctx.player.id })
        .eq('id', ctx.round.id)
        .eq('status', 'active')
        .is('found_claimed_at', null)
        .select()
        .maybeSingle()
      if (!round) return json({ error: 'A find is already waiting on the hiders.' }, 409)
      return json({ round })
    }

    if (action === 'confirm') {
      requireRole(ctx, 'hider')
      if (!ctx.round.found_claimed_at) return json({ error: "The seekers haven't claimed a find." }, 400)
      const { error } = await admin.rpc('hide_and_seek_finish_round', {
        p_round_id: ctx.round.id,
        p_reason: 'found',
      })
      if (error) return json({ error: error.message }, 500)
      const { data: round } = await admin.from('hide_and_seek_rounds').select('*').eq('id', ctx.round.id).single()
      return json({ round })
    }

    if (action === 'reject') {
      const { data: round } = await admin
        .from('hide_and_seek_rounds')
        .update({ found_claimed_at: null, found_claimed_by_player_id: null })
        .eq('id', ctx.round.id)
        .eq('status', 'active')
        .not('found_claimed_at', 'is', null)
        .select()
        .maybeSingle()
      if (!round) return json({ error: 'There is no find to reject.' }, 409)
      return json({ round })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
