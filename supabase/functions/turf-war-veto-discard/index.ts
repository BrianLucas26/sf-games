import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

// Only the team NOT capturing can veto, and only while the proposal is still
// pending and within its window. The `.eq('status', 'pending')` in the
// update is the atomic guard against two near-simultaneous veto attempts (or
// a veto racing the expiry sweep) both succeeding.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'veto-discard', 10))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await req.json()
    const { proposal_id } = body as { proposal_id?: string }
    if (!proposal_id) return json({ error: 'proposal_id is required.' }, 400)

    const { data: proposal } = await admin
      .from('turf_war_discard_proposals')
      .select('id, game_id, capture_id, expires_at, status')
      .eq('id', proposal_id)
      .single()
    if (!proposal) return json({ error: 'Proposal not found.' }, 404)

    const { data: capture } = await admin
      .from('turf_war_captures')
      .select('team_id')
      .eq('id', proposal.capture_id)
      .single()
    if (!capture) return json({ error: 'Capture not found.' }, 404)

    const { data: player } = await admin
      .from('players')
      .select('id, team_id')
      .eq('game_id', proposal.game_id)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!player) return json({ error: 'You are not a player in this game.' }, 403)
    if (player.team_id === capture.team_id) {
      return json({ error: 'The capturing team cannot veto its own proposal.' }, 403)
    }

    if (new Date(proposal.expires_at).getTime() <= Date.now()) {
      return json({ error: 'The veto window has already passed.' }, 409)
    }

    const { data: updated, error } = await admin
      .from('turf_war_discard_proposals')
      .update({ status: 'vetoed', resolved_at: new Date().toISOString(), veto_by_player_id: player.id })
      .eq('id', proposal_id)
      .eq('status', 'pending')
      .select()
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!updated) return json({ error: 'This proposal was already resolved.' }, 409)

    return json({ proposal: updated })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
