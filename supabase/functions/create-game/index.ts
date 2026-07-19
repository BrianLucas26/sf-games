import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { generateJoinCode } from '../_shared/joinCode.ts'
import { verifyTurnstile } from '../_shared/verifyTurnstile.ts'

// Generic across every game type: look up game_types by slug, create the
// games + teams rows, and add the caller as the host's first player. Any
// game-type-specific setup (seeding zones, etc.) happens later in that game's
// own "start" function, once the lobby is full and settings are confirmed.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) before creating a game.' }, 401)

    const body = await req.json()
    const { game_type_slug, host_display_name, team_names, settings, turnstile_token } = body as {
      game_type_slug?: string
      host_display_name?: string
      team_names?: string[]
      settings?: Record<string, unknown>
      turnstile_token?: string
    }

    if (!game_type_slug || !host_display_name) {
      return json({ error: 'game_type_slug and host_display_name are required.' }, 400)
    }

    // Supabase's own edge runtime forwards the caller's IP via x-forwarded-for
    // (this request never passes through the site's Cloudflare zone, so
    // cf-connecting-ip wouldn't be present here even if the site is fronted
    // by Cloudflare).
    const callerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const verified = await verifyTurnstile(turnstile_token, callerIp)
    if (!verified) return json({ error: 'Human verification failed. Please try again.' }, 403)

    const admin = createServiceRoleClient()

    // System-wide safety net -- Turnstile raises the cost per creation but
    // doesn't hard-cap it. cleanup-games already sweeps stale lobbies, so
    // this should never bind in normal use; it just bounds the worst case.
    const { count: openGameCount } = await admin
      .from('games')
      .select('id', { count: 'exact', head: true })
      .in('status', ['lobby', 'active'])
    if ((openGameCount ?? 0) >= 200) {
      return json({ error: 'Too many games are running right now -- try again shortly.' }, 503)
    }

    const { data: gameType, error: gameTypeError } = await admin
      .from('game_types')
      .select('id')
      .eq('slug', game_type_slug)
      .single()
    if (gameTypeError || !gameType) {
      return json({ error: `Unknown game type: ${game_type_slug}` }, 404)
    }

    let joinCode = ''
    for (let attempt = 0; attempt < 5 && !joinCode; attempt++) {
      const candidate = generateJoinCode()
      const { data: existing } = await admin
        .from('games')
        .select('id')
        .eq('join_code', candidate)
        .maybeSingle()
      if (!existing) joinCode = candidate
    }
    if (!joinCode) return json({ error: 'Could not generate a unique join code, try again.' }, 500)

    const { data: game, error: gameError } = await admin
      .from('games')
      .insert({
        game_type_id: gameType.id,
        join_code: joinCode,
        host_id: user.id,
        settings: settings ?? {},
      })
      .select()
      .single()
    if (gameError || !game) return json({ error: gameError?.message ?? 'Failed to create game' }, 500)

    const names = team_names?.length ? team_names : ['Team A', 'Team B']
    const { data: teams, error: teamsError } = await admin
      .from('teams')
      .insert(names.map((name) => ({ game_id: game.id, name })))
      .select()
    if (teamsError) return json({ error: teamsError.message }, 500)

    const { data: player, error: playerError } = await admin
      .from('players')
      .insert({
        game_id: game.id,
        display_name: host_display_name,
        is_host: true,
        auth_user_id: user.id,
      })
      .select()
      .single()
    if (playerError || !player) {
      return json({ error: playerError?.message ?? 'Failed to add host as player' }, 500)
    }

    return json({ game, teams, player })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
