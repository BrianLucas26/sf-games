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

const MAX_BENCHMARK_LENGTH = 60

// Hiders play a held curse. The casting cost is paid here: a discard cost
// (discard N held curses, or the whole hand) is enforced against the real
// hand, so a curse the hider can't pay for simply can't be cast. Every other
// printed cost -- send a photo, be 5km away, roll a die -- is a physical one
// this app can't see, so the client confirms it was paid (cost_confirmed).
//
// The curse leaves the (team-private) hand and becomes a public
// hide_and_seek_active_curses row the seekers see: 'timer' curses expire on
// their own, 'task' curses wait for a seeker to mark them done, 'deadline'
// curses end whichever way comes first, and 'round' curses stand until the
// round is over.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-play-curse', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await readBody<{
      game_id: string
      card_id: string
      discard_card_ids: string[]
      benchmark_value: string
      cost_confirmed: boolean
    }>(req)
    const { game_id, card_id } = body
    const discardIds = Array.isArray(body.discard_card_ids) ? [...new Set(body.discard_card_ids)] : []
    const benchmarkValue = typeof body.benchmark_value === 'string' ? body.benchmark_value.trim() : ''
    if (!game_id || !card_id) return json({ error: 'game_id and card_id are required.' }, 400)
    if (body.cost_confirmed !== true) return json({ error: 'Confirm the casting cost first.' }, 400)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'hider')
    requireActiveRound(ctx.round)

    const { data: card } = await admin
      .from('hide_and_seek_hand_cards')
      .select('*')
      .eq('id', card_id)
      .eq('round_id', ctx.round.id)
      .eq('team_id', ctx.player.team_id)
      .eq('status', 'held')
      .maybeSingle()
    if (!card) return json({ error: "That curse isn't in your hand." }, 404)

    if (card.benchmark_label && !benchmarkValue) {
      return json({ error: `Enter the ${card.benchmark_label} before casting this curse.` }, 400)
    }
    if (benchmarkValue.length > MAX_BENCHMARK_LENGTH) {
      return json({ error: `Keep that under ${MAX_BENCHMARK_LENGTH} characters.` }, 400)
    }

    // The rest of the hand -- what a discard cost can be paid out of. The
    // curse being cast isn't discardable; it's leaving the hand either way.
    const { data: otherHeld } = await admin
      .from('hide_and_seek_hand_cards')
      .select('id')
      .eq('round_id', ctx.round.id)
      .eq('team_id', ctx.player.team_id)
      .eq('status', 'held')
      .neq('id', card_id)
    const heldIds = new Set((otherHeld ?? []).map((c) => c.id as string))

    let toDiscard: string[] = []
    if (card.discard_hand) {
      toDiscard = [...heldIds]
    } else if (card.discard_cost) {
      if (heldIds.size < card.discard_cost) {
        return json(
          {
            error: `This curse costs ${card.discard_cost} discard${card.discard_cost === 1 ? '' : 's'} -- you only hold ${heldIds.size} other curse${heldIds.size === 1 ? '' : 's'}.`,
          },
          400,
        )
      }
      if (discardIds.length !== card.discard_cost || !discardIds.every((id) => heldIds.has(id))) {
        return json(
          { error: `Choose exactly ${card.discard_cost} curse${card.discard_cost === 1 ? '' : 's'} from your hand to discard.` },
          400,
        )
      }
      toDiscard = discardIds
    }

    // Atomic guard: only a still-held card flips to played.
    const { data: played } = await admin
      .from('hide_and_seek_hand_cards')
      .update({ status: 'played' })
      .eq('id', card_id)
      .eq('status', 'held')
      .select()
      .maybeSingle()
    if (!played) return json({ error: 'That curse was already played.' }, 409)

    if (toDiscard.length > 0) {
      await admin.from('hide_and_seek_hand_cards').update({ status: 'discarded' }).in('id', toDiscard)
    }

    const playedAt = new Date()
    const timed = card.clear_mode === 'timer' || card.clear_mode === 'deadline'
    const { data: active, error } = await admin
      .from('hide_and_seek_active_curses')
      .insert({
        game_id,
        round_id: ctx.round.id,
        curse_key: card.curse_key,
        name: card.name,
        description: card.description,
        casting_cost: card.casting_cost,
        notes: card.notes,
        clear_mode: card.clear_mode,
        blocks_questions: card.blocks_questions,
        duration_minutes: card.duration_minutes,
        benchmark_value: benchmarkValue || null,
        played_by_player_id: ctx.player.id,
        played_at: playedAt.toISOString(),
        expires_at:
          timed && card.duration_minutes
            ? new Date(playedAt.getTime() + card.duration_minutes * 60_000).toISOString()
            : null,
      })
      .select()
      .single()
    if (error) return json({ error: error.message }, 500)

    return json({ curse: active, discarded: toDiscard.length })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
