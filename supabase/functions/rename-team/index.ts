import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

const MAX_NAME_LENGTH = 30

// Generic across every game type: the host renames a team (default "Team A"
// / "Team B") while still in the lobby. Mirrors update-game-settings's
// host-only + lobby-only checks.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id, team_id, name } = body as { game_id?: string; team_id?: string; name?: string }
    if (!game_id || !team_id || !name?.trim()) {
      return json({ error: 'game_id, team_id, and name are required.' }, 400)
    }
    const trimmedName = name.trim().slice(0, MAX_NAME_LENGTH)

    const admin = createServiceRoleClient()

    const { data: game } = await admin.from('games').select('host_id, status').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.host_id !== user.id) return json({ error: 'Only the host can rename teams.' }, 403)
    if (game.status !== 'lobby') return json({ error: 'Teams are locked once the game starts.' }, 400)

    const { data: team, error } = await admin
      .from('teams')
      .update({ name: trimmedName })
      .eq('id', team_id)
      .eq('game_id', game_id)
      .select()
      .single()
    if (error || !team) return json({ error: error?.message ?? 'Team not found.' }, 404)

    return json({ team })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
