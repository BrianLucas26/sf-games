import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

// Replaces the caller's team's whole queued-veto set in one call (rather than
// a toggle-one-cell endpoint) -- picks are freely editable up to the veto
// deadline, so the client just resends its full desired list on every tap and
// this does a delete-then-insert. Avoids any toggle-race complexity.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'set-vetoes', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await req.json()
    const { game_id, cell_ids } = body as { game_id?: string; cell_ids?: unknown }
    if (!game_id || !Array.isArray(cell_ids) || !cell_ids.every((id) => typeof id === 'string')) {
      return json({ error: 'game_id and cell_ids (string[]) are required.' }, 400)
    }
    const uniqueCellIds = [...new Set(cell_ids as string[])]

    const { data: game } = await admin.from('games').select('status').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)
    if (game.status !== 'active') return json({ error: 'Game is not currently active.' }, 400)

    const { data: player } = await admin
      .from('players')
      .select('id, team_id')
      .eq('game_id', game_id)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!player) return json({ error: 'You are not a player in this game.' }, 403)
    if (!player.team_id) return json({ error: 'Join a team before vetoing a challenge.' }, 400)

    const { data: gameState } = await admin
      .from('lockout_game_state')
      .select('veto_ends_at, vetoes_resolved, veto_limit')
      .eq('game_id', game_id)
      .single()
    if (!gameState) return json({ error: 'Game state not found.' }, 500)
    if (!gameState.veto_ends_at || gameState.vetoes_resolved) {
      return json({ error: 'The veto period has ended.' }, 400)
    }
    if (new Date(gameState.veto_ends_at) <= new Date()) {
      return json({ error: 'The veto period has ended.' }, 400)
    }
    if (uniqueCellIds.length > gameState.veto_limit) {
      return json({ error: `You can veto at most ${gameState.veto_limit} challenge(s).` }, 400)
    }

    if (uniqueCellIds.length > 0) {
      const { data: cells } = await admin
        .from('lockout_cells')
        .select('id')
        .eq('game_id', game_id)
        .in('id', uniqueCellIds)
      if (!cells || cells.length !== uniqueCellIds.length) {
        return json({ error: 'One or more challenges are not on this board.' }, 400)
      }
    }

    const { error: deleteError } = await admin
      .from('lockout_pending_vetoes')
      .delete()
      .eq('game_id', game_id)
      .eq('team_id', player.team_id)
    if (deleteError) return json({ error: deleteError.message }, 500)

    if (uniqueCellIds.length > 0) {
      const { error: insertError } = await admin.from('lockout_pending_vetoes').insert(
        uniqueCellIds.map((cell_id) => ({ game_id, team_id: player.team_id, cell_id })),
      )
      if (insertError) return json({ error: insertError.message }, 500)
    }

    return json({ cellIds: uniqueCellIds })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
