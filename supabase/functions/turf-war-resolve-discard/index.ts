import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'

// Fast path for applying an expired discard proposal: any client watching
// the countdown calls this the instant it hits zero, so the discard doesn't
// have to wait for the next pg_cron sweep (which is the safety net for when
// nobody's client is around to call this). Idempotent -- a no-op if the
// proposal was already resolved or hasn't expired yet.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { proposal_id } = body as { proposal_id?: string }
    if (!proposal_id) return json({ error: 'proposal_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: proposal } = await admin
      .from('turf_war_discard_proposals')
      .select('id, game_id, target_zone_id, status, expires_at')
      .eq('id', proposal_id)
      .single()
    if (!proposal) return json({ error: 'Proposal not found.' }, 404)

    if (proposal.status !== 'pending' || new Date(proposal.expires_at).getTime() > Date.now()) {
      return json({ proposal, applied: false })
    }

    const { data: updated } = await admin
      .from('turf_war_discard_proposals')
      .update({ status: 'applied', resolved_at: new Date().toISOString() })
      .eq('id', proposal_id)
      .eq('status', 'pending')
      .select()
      .maybeSingle()
    if (!updated) return json({ proposal, applied: false })

    await admin
      .from('turf_war_zones')
      .update({ status: 'discarded', discarded_at: new Date().toISOString() })
      .eq('id', proposal.target_zone_id)
      .eq('status', 'open')

    await admin.rpc('turf_war_replenish_open_zones', { p_game_id: proposal.game_id })

    return json({ proposal: updated, applied: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
