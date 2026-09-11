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
  requireSeekingStarted,
} from '../_shared/hideAndSeek.ts'
import { HIDE_AND_SEEK_QUESTIONS } from '../../../content/hide-and-seek-questions.ts'

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
}

// Seekers ask one question from the bank. Refused while the hiding period is
// running, while an earlier question is still unanswered, while a blocking
// curse is active, while a find is awaiting confirmation, or if the question
// was already asked this round. The last two DB-level guards
// (unique (round_id, question_key) and the one-pending partial index) are
// what actually make this safe against two seekers tapping at once.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-ask-question', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const { game_id, question_key, lat, lng } = await readBody<{
      game_id: string
      question_key: string
      lat: number
      lng: number
    }>(req)
    if (!game_id || !question_key) return json({ error: 'game_id and question_key are required.' }, 400)

    const question = HIDE_AND_SEEK_QUESTIONS.find((q) => q.id === question_key)
    if (!question) return json({ error: 'Unknown question.' }, 404)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'seeker')
    requireActiveRound(ctx.round)
    requireSeekingStarted(ctx.round)
    if (ctx.round.found_claimed_at) {
      return json({ error: 'Waiting on the hiders to confirm your find.' }, 400)
    }

    const nowIso = new Date().toISOString()
    const { data: blocking } = await admin
      .from('hide_and_seek_active_curses')
      .select('name')
      .eq('round_id', ctx.round.id)
      .eq('blocks_questions', true)
      .is('cleared_at', null)
      .or(`expires_at.is.null,expires_at.gt."${nowIso}"`)
      .limit(1)
    if (blocking && blocking.length > 0) {
      return json({ error: `You're cursed: ${blocking[0].name}. Clear it before asking another question.` }, 400)
    }

    const hasLocation = isCoordinate(lat, 90) && isCoordinate(lng, 180)

    const { data: row, error } = await admin
      .from('hide_and_seek_questions')
      .insert({
        game_id,
        round_id: ctx.round.id,
        question_key: question.id,
        category: question.category,
        prompt: question.prompt,
        answer_options: question.answers ?? null,
        draw_count: question.cost.draw,
        keep_count: question.cost.keep,
        asked_by_player_id: ctx.player.id,
        asked_from_lat: hasLocation ? lat : null,
        asked_from_lng: hasLocation ? lng : null,
      })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        return json(
          {
            error: error.message.includes('one_pending')
              ? 'Wait for the hiders to answer the current question.'
              : 'That question was already asked this round.',
          },
          409,
        )
      }
      return json({ error: error.message }, 500)
    }

    return json({ question: row })
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
