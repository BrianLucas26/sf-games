import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'
import {
  fullDeckKeys,
  HttpError,
  loadRoundContext,
  readBody,
  requireActiveRound,
  requireRole,
  shuffle,
} from '../_shared/hideAndSeek.ts'
import { HIDE_AND_SEEK_CURSES } from '../../../content/hide-and-seek-curses.ts'

const MAX_ANSWER_LENGTH = 500

// Removes one occurrence of each key in `remove` from `keys` (multiset
// difference -- a curse with copies: 2 and one copy in hand still leaves
// one to reshuffle).
function withoutKeys(keys: string[], remove: string[]): string[] {
  const counts = new Map<string, number>()
  for (const key of remove) counts.set(key, (counts.get(key) ?? 0) + 1)
  return keys.filter((key) => {
    const n = counts.get(key) ?? 0
    if (n === 0) return true
    counts.set(key, n - 1)
    return false
  })
}

// Hiders answer the pending question, which pays out its cost: draw N curses
// from the round's deck into a pending offer the hiders then keep K of
// (hide-and-seek-keep-curses). The conditional update on answered_at is the
// atomic guard -- a double-tap can't answer (and draw) twice.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-answer-question', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await readBody<{ game_id: string; question_id: string; answer: string }>(req)
    const { game_id, question_id } = body
    const answer = typeof body.answer === 'string' ? body.answer.trim() : ''
    if (!game_id || !question_id) return json({ error: 'game_id and question_id are required.' }, 400)
    if (!answer) return json({ error: 'Answer is required.' }, 400)
    if (answer.length > MAX_ANSWER_LENGTH) {
      return json({ error: `Answers are limited to ${MAX_ANSWER_LENGTH} characters.` }, 400)
    }

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'hider')
    requireActiveRound(ctx.round)

    const { data: question } = await admin
      .from('hide_and_seek_questions')
      .select('*')
      .eq('id', question_id)
      .eq('round_id', ctx.round.id)
      .maybeSingle()
    if (!question) return json({ error: 'Question not found.' }, 404)
    if (question.answer_options && !question.answer_options.includes(answer)) {
      return json({ error: `Answer must be one of: ${question.answer_options.join(', ')}.` }, 400)
    }

    const { data: answered, error: answerError } = await admin
      .from('hide_and_seek_questions')
      .update({ answer, answered_by_player_id: ctx.player.id, answered_at: new Date().toISOString() })
      .eq('id', question_id)
      .is('answered_at', null)
      .select()
      .maybeSingle()
    if (answerError) return json({ error: answerError.message }, 500)
    if (!answered) return json({ error: 'That question was already answered.' }, 409)

    // --- Pay out the cost: draw from the deck. ---
    const { data: deck } = await admin
      .from('hide_and_seek_decks')
      .select('draw_pile')
      .eq('round_id', ctx.round.id)
      .single()
    if (!deck) return json({ error: 'Curse deck not found.' }, 500)

    let pile: string[] = deck.draw_pile ?? []
    const drawn: string[] = []
    for (let i = 0; i < question.draw_count; i++) {
      if (pile.length === 0) {
        // Reshuffle everything not currently in the hiders' hand (or already
        // drawn by this very call) back into the pile.
        const { data: inHand } = await admin
          .from('hide_and_seek_hand_cards')
          .select('curse_key')
          .eq('round_id', ctx.round.id)
          .in('status', ['offered', 'held'])
        const held = (inHand ?? []).map((c) => c.curse_key as string)
        pile = shuffle(withoutKeys(fullDeckKeys(), [...held, ...drawn]))
        if (pile.length === 0) break
      }
      drawn.push(pile[0])
      pile = pile.slice(1)
    }

    const { error: deckError } = await admin
      .from('hide_and_seek_decks')
      .update({ draw_pile: pile })
      .eq('round_id', ctx.round.id)
    if (deckError) return json({ error: deckError.message }, 500)

    // A key can go missing if the content file was edited mid-round -- just
    // skip it rather than failing the whole answer.
    const curses = drawn
      .map((key) => HIDE_AND_SEEK_CURSES.find((c) => c.id === key))
      .filter((c): c is (typeof HIDE_AND_SEEK_CURSES)[number] => Boolean(c))
    if (curses.length === 0) return json({ question: answered, offer: null })

    const { data: offer, error: offerError } = await admin
      .from('hide_and_seek_curse_offers')
      .insert({
        game_id,
        round_id: ctx.round.id,
        team_id: ctx.round.hider_team_id,
        question_id,
        keep_count: Math.min(question.keep_count, curses.length),
      })
      .select()
      .single()
    if (offerError) return json({ error: offerError.message }, 500)

    const { error: cardsError } = await admin.from('hide_and_seek_hand_cards').insert(
      curses.map((curse) => ({
        game_id,
        round_id: ctx.round.id,
        team_id: ctx.round.hider_team_id,
        curse_key: curse.id,
        name: curse.name,
        description: curse.description,
        duration_minutes: curse.durationMinutes ?? null,
        blocks_questions: curse.blocksQuestions ?? true,
        status: 'offered',
        offer_id: offer.id,
      })),
    )
    if (cardsError) return json({ error: cardsError.message }, 500)

    return json({ question: answered, offer })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
