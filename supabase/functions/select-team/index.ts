import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

// Generic across every game type: a player picks (or changes) their team
// while still in the lobby. Locked once the game has started.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id, team_id } = body as { game_id?: string; team_id?: string }
    if (!game_id || !team_id) return json({ error: 'game_id and team_id are required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game } = await admin.from('games').select('status').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.status !== 'lobby') return json({ error: 'Teams are locked once the game starts.' }, 400)

    const { data: team } = await admin
      .from('teams')
      .select('id')
      .eq('id', team_id)
      .eq('game_id', game_id)
      .maybeSingle()
    if (!team) return json({ error: 'That team is not part of this game.' }, 404)

    const { data: player, error } = await admin
      .from('players')
      .update({ team_id })
      .eq('game_id', game_id)
      .eq('auth_user_id', user.id)
      .select()
      .single()
    if (error || !player) return json({ error: error?.message ?? 'You are not a player in this game.' }, 404)

    return json({ player })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
