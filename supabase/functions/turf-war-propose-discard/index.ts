import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

const VETO_WINDOW_SECONDS = 30

// The capturing team calls this to spend their capture's discard privilege.
// Veto is spent once per capture (not per proposal): if a sibling proposal
// for the same capture_id was already vetoed, this one applies immediately
// with no veto window -- the board is shared and it's a race to discard.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id, capture_id, target_zone_id } = body as {
      game_id?: string
      capture_id?: string
      target_zone_id?: string
    }
    if (!game_id || !capture_id || !target_zone_id) {
      return json({ error: 'game_id, capture_id, and target_zone_id are required.' }, 400)
    }

    const admin = createServiceRoleClient()

    const { data: player } = await admin
      .from('players')
      .select('id, team_id')
      .eq('game_id', game_id)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!player) return json({ error: 'You are not a player in this game.' }, 403)

    const { data: capture } = await admin
      .from('turf_war_captures')
      .select('id, game_id, team_id, zone_id')
      .eq('id', capture_id)
      .eq('game_id', game_id)
      .single()
    if (!capture) return json({ error: 'Capture not found.' }, 404)
    if (capture.team_id !== player.team_id) {
      return json({ error: 'Only the capturing team can propose a discard.' }, 403)
    }
    if (target_zone_id === capture.zone_id) {
      return json({ error: 'Cannot discard the zone you just claimed.' }, 400)
    }

    const { data: targetZone } = await admin
      .from('turf_war_zones')
      .select('id, status')
      .eq('id', target_zone_id)
      .eq('game_id', game_id)
      .single()
    if (!targetZone) return json({ error: 'Target zone not found.' }, 404)
    if (targetZone.status !== 'open') {
      return json({ error: 'Only currently open zones can be discarded.' }, 400)
    }

    const { data: siblingProposals } = await admin
      .from('turf_war_discard_proposals')
      .select('id, status, target_zone_id')
      .eq('capture_id', capture_id)
    if ((siblingProposals ?? []).some((p) => p.status === 'pending')) {
      return json({ error: 'A discard proposal is already pending for this capture.' }, 400)
    }
    if ((siblingProposals ?? []).some((p) => p.status === 'vetoed' && p.target_zone_id === target_zone_id)) {
      return json({ error: 'That zone was already vetoed for this capture -- pick a different one.' }, 400)
    }
    const vetoAlreadySpent = (siblingProposals ?? []).some((p) => p.status === 'vetoed')

    if (vetoAlreadySpent) {
      const { data: proposal, error: insertError } = await admin
        .from('turf_war_discard_proposals')
        .insert({
          game_id,
          capture_id,
          target_zone_id,
          status: 'applied',
          expires_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (insertError || !proposal) return json({ error: insertError?.message ?? 'Failed to discard' }, 500)

      await admin
        .from('turf_war_zones')
        .update({ status: 'discarded', discarded_at: new Date().toISOString() })
        .eq('id', target_zone_id)
        .eq('status', 'open')

      await admin.rpc('turf_war_replenish_open_zones', { p_game_id: game_id })

      return json({ proposal, vetoable: false })
    }

    const expiresAt = new Date(Date.now() + VETO_WINDOW_SECONDS * 1000)
    const { data: proposal, error: insertError } = await admin
      .from('turf_war_discard_proposals')
      .insert({
        game_id,
        capture_id,
        target_zone_id,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()
    if (insertError || !proposal) {
      return json({ error: insertError?.message ?? 'Failed to propose discard' }, 500)
    }

    return json({ proposal, vetoable: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
