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

// Hiders resolve a pending draw: keep exactly `keep_count` of the offered
// curses (capped at the hand limit), the rest are discarded. If keeping them
// would push the hand over the game's hand limit, the request must also name
// enough held curses to discard to make room.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-keep-curses', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await readBody<{
      game_id: string
      offer_id: string
      keep_card_ids: string[]
      discard_card_ids: string[]
    }>(req)
    const { game_id, offer_id } = body
    const keepIds = Array.isArray(body.keep_card_ids) ? [...new Set(body.keep_card_ids)] : []
    const discardIds = Array.isArray(body.discard_card_ids) ? [...new Set(body.discard_card_ids)] : []
    if (!game_id || !offer_id) return json({ error: 'game_id and offer_id are required.' }, 400)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'hider')
    requireActiveRound(ctx.round)

    const { data: offer } = await admin
      .from('hide_and_seek_curse_offers')
      .select('*')
      .eq('id', offer_id)
      .eq('round_id', ctx.round.id)
      .eq('team_id', ctx.player.team_id)
      .maybeSingle()
    if (!offer) return json({ error: 'Draw not found.' }, 404)
    if (offer.resolved_at) return json({ error: 'You already chose from this draw.' }, 409)

    const { data: cards } = await admin
      .from('hide_and_seek_hand_cards')
      .select('id, status, offer_id')
      .eq('round_id', ctx.round.id)
      .eq('team_id', ctx.player.team_id)
      .in('status', ['offered', 'held'])
    const offeredIds = new Set((cards ?? []).filter((c) => c.offer_id === offer_id && c.status === 'offered').map((c) => c.id))
    const heldIds = new Set((cards ?? []).filter((c) => c.status === 'held').map((c) => c.id))

    const { data: gameState } = await admin
      .from('hide_and_seek_game_state')
      .select('hand_limit')
      .eq('game_id', game_id)
      .single()
    if (!gameState) return json({ error: 'Game state not found.' }, 500)

    // A keep-2 question can't force a hand past a limit of 1 -- mirrored in CurseHand.tsx.
    const keepCount = Math.min(offer.keep_count, gameState.hand_limit)
    if (keepIds.length !== keepCount || !keepIds.every((id) => offeredIds.has(id))) {
      return json({ error: `Pick exactly ${keepCount} of the drawn curses to keep.` }, 400)
    }
    if (!discardIds.every((id) => heldIds.has(id))) {
      return json({ error: 'You can only discard curses already in your hand.' }, 400)
    }

    const handSizeAfter = heldIds.size - discardIds.length + keepIds.length
    if (handSizeAfter > gameState.hand_limit) {
      const over = handSizeAfter - gameState.hand_limit
      return json(
        { error: `Hand limit is ${gameState.hand_limit} -- discard ${over} more curse${over === 1 ? '' : 's'} from your hand.` },
        400,
      )
    }

    // Atomic guard: only one resolution per offer, even on a double-tap.
    const { data: resolved } = await admin
      .from('hide_and_seek_curse_offers')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', offer_id)
      .is('resolved_at', null)
      .select()
      .maybeSingle()
    if (!resolved) return json({ error: 'You already chose from this draw.' }, 409)

    const tossIds = [...offeredIds].filter((id) => !keepIds.includes(id))
    await admin.from('hide_and_seek_hand_cards').update({ status: 'held' }).in('id', keepIds)
    if (tossIds.length > 0 || discardIds.length > 0) {
      await admin
        .from('hide_and_seek_hand_cards')
        .update({ status: 'discarded' })
        .in('id', [...tossIds, ...discardIds])
    }

    return json({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
