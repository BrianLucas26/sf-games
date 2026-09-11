import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import {
  HttpError,
  loadRoundContext,
  readBody,
  requireActiveRound,
  requireRole,
} from '../_shared/hideAndSeek.ts'

// Hiders play a held curse at any point during their round. It leaves the
// (team-private) hand and becomes a public hide_and_seek_active_curses row the
// seekers see -- timed curses expire on their own, task curses wait for a
// seeker to mark them done (hide-and-seek-clear-curse).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-play-curse', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const { game_id, card_id } = await readBody<{ game_id: string; card_id: string }>(req)
    if (!game_id || !card_id) return json({ error: 'game_id and card_id are required.' }, 400)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'hider')
    requireActiveRound(ctx.round)

    // Atomic guard: only a still-held card flips to played.
    const { data: card } = await admin
      .from('hide_and_seek_hand_cards')
      .update({ status: 'played' })
      .eq('id', card_id)
      .eq('round_id', ctx.round.id)
      .eq('team_id', ctx.player.team_id)
      .eq('status', 'held')
      .select()
      .maybeSingle()
    if (!card) return json({ error: "That curse isn't in your hand." }, 409)

    const playedAt = new Date()
    const { data: active, error } = await admin
      .from('hide_and_seek_active_curses')
      .insert({
        game_id,
        round_id: ctx.round.id,
        curse_key: card.curse_key,
        name: card.name,
        description: card.description,
        duration_minutes: card.duration_minutes,
        blocks_questions: card.blocks_questions,
        played_by_player_id: ctx.player.id,
        played_at: playedAt.toISOString(),
        expires_at: card.duration_minutes
          ? new Date(playedAt.getTime() + card.duration_minutes * 60_000).toISOString()
          : null,
      })
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)

    return json({ curse: active })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
