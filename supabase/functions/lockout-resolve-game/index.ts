import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'

// Fast path for the time-limit resolution: any client watching the countdown
// calls this the instant it hits zero, so the game doesn't have to wait for
// the next pg_cron sweep (lockout_tick, the safety net for when nobody's
// client is around). Idempotent -- lockout_resolve_game no-ops if the game
// isn't active, is already in sudden death, or hasn't actually expired yet.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { game_id } = body as { game_id?: string }
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { error } = await admin.rpc('lockout_resolve_game', { p_game_id: game_id })
    if (error) return json({ error: error.message }, 500)

    const { data: game } = await admin.from('games').select('*').eq('id', game_id).single()
    const { data: gameState } = await admin
      .from('lockout_game_state')
      .select('*')
      .eq('game_id', game_id)
      .single()

    return json({ game, gameState })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
