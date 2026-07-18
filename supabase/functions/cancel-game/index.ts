import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

// Generic across every game type: the host shuts down and deletes their own
// lobby before it starts. Deleting the games row cascades to teams/players --
// nothing else references a game that hasn't started yet (per-game-type
// instance tables like turf_war_zones only get created by that game's own
// "start" function). Scoped to status='lobby' -- ending an already-active
// game early is a different feature, not what was asked for here.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id } = body as { game_id?: string }
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game } = await admin.from('games').select('host_id, status').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.host_id !== user.id) return json({ error: 'Only the host can cancel this lobby.' }, 403)
    if (game.status !== 'lobby') {
      return json({ error: 'Only a lobby that has not started can be cancelled.' }, 400)
    }

    const { error } = await admin.from('games').delete().eq('id', game_id)
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
