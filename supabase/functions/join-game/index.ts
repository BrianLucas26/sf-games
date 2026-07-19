import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { verifyTurnstile } from '../_shared/verifyTurnstile.ts'

// Generic across every game type: resolve a join code to a game and add the
// caller as a player, not yet on a team (see select-team).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) before joining a game.' }, 401)

    const body = await req.json()
    const { join_code, display_name, turnstile_token } = body as {
      join_code?: string
      display_name?: string
      turnstile_token?: string
    }
    if (!join_code || !display_name) {
      return json({ error: 'join_code and display_name are required.' }, 400)
    }

    const callerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const verified = await verifyTurnstile(turnstile_token, callerIp)
    if (!verified) return json({ error: 'Human verification failed. Please try again.' }, 403)

    const admin = createServiceRoleClient()

    const { data: game, error: gameError } = await admin
      .from('games')
      .select('*')
      .eq('join_code', join_code.toUpperCase())
      .maybeSingle()
    if (gameError) return json({ error: gameError.message }, 500)
    if (!game) return json({ error: 'No game found for that join code.' }, 404)
    if (game.status !== 'lobby') {
      return json({ error: 'This game has already started or ended.' }, 400)
    }

    // Sane ceiling against a join flood targeting one game -- Turnstile
    // raises the cost per join but doesn't hard-cap it, and nothing else
    // bounds how many player rows a single lobby can accumulate.
    const { count: playerCount } = await admin
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', game.id)
    if ((playerCount ?? 0) >= 40) {
      return json({ error: 'This lobby is full.' }, 400)
    }

    const { data: player, error: playerError } = await admin
      .from('players')
      .insert({
        game_id: game.id,
        display_name,
        is_host: false,
        auth_user_id: user.id,
      })
      .select()
      .single()
    if (playerError || !player) return json({ error: playerError?.message ?? 'Failed to join' }, 500)

    return json({ game, player })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
