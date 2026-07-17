import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

// Generic across every game type: the host edits games.settings (whatever
// shape their game defines, e.g. TurfWarSettings) while still in the lobby.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id, settings } = body as { game_id?: string; settings?: Record<string, unknown> }
    if (!game_id || !settings) return json({ error: 'game_id and settings are required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game } = await admin.from('games').select('host_id, status').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.host_id !== user.id) return json({ error: 'Only the host can change settings.' }, 403)
    if (game.status !== 'lobby') return json({ error: 'Settings are locked once the game starts.' }, 400)

    const { data: updated, error } = await admin
      .from('games')
      .update({ settings })
      .eq('id', game_id)
      .select()
      .single()
    if (error || !updated) return json({ error: error?.message ?? 'Failed to update settings' }, 500)

    return json({ game: updated })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
