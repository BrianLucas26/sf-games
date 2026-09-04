import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { LOCKOUT_CHALLENGES } from '../../../content/lockout-challenges.ts'

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Fast path for veto resolution: any client watching the veto countdown
// calls this the instant it hits zero, same convention as
// lockout-resolve-game (round-end) and turf-war-resolve-discard. No
// caller-identity check -- it's a "resolve whatever's true" endpoint, not a
// privileged action. Idempotent via the atomic vetoes_resolved=false update
// guard below, so both teams' clients racing to call this at once is safe.
// lockout_tick() is the SQL-only safety net for when no client is around,
// but it can't replicate the challenge-bank lookup here (see 0035's
// migration comment), so it only unblocks claiming without replacing text.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { game_id } = body as { game_id?: string }
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game } = await admin.from('games').select('status').eq('id', game_id).single()
    if (!game || game.status !== 'active') return json({ skipped: true })

    const { data: gameState } = await admin
      .from('lockout_game_state')
      .select('veto_ends_at, vetoes_resolved')
      .eq('game_id', game_id)
      .single()
    if (!gameState) return json({ error: 'Game state not found.' }, 500)
    if (!gameState.veto_ends_at || gameState.vetoes_resolved) return json({ skipped: true })
    if (new Date(gameState.veto_ends_at) > new Date()) return json({ skipped: true })

    // Atomic guard: only the caller who flips vetoes_resolved false->true
    // proceeds with the (one-time) replacement work.
    const { data: claimed, error: claimError } = await admin
      .from('lockout_game_state')
      .update({ vetoes_resolved: true })
      .eq('game_id', game_id)
      .eq('vetoes_resolved', false)
      .select()
      .maybeSingle()
    if (claimError) return json({ error: claimError.message }, 500)
    if (!claimed) return json({ skipped: true })

    const { data: pending } = await admin
      .from('lockout_pending_vetoes')
      .select('cell_id')
      .eq('game_id', game_id)
    const vetoedCellIds = [...new Set((pending ?? []).map((p) => p.cell_id as string))]

    if (vetoedCellIds.length === 0) {
      return json({ replacedCellIds: [] })
    }

    const { data: allCells } = await admin.from('lockout_cells').select('id, prompt').eq('game_id', game_id)
    const usedPrompts = new Set((allCells ?? []).map((c) => c.prompt as string))
    const candidates = shuffle(LOCKOUT_CHALLENGES.filter((c) => !usedPrompts.has(c.prompt)))

    if (candidates.length < vetoedCellIds.length) {
      return json({ error: 'Not enough remaining challenges to replace all vetoes.' }, 500)
    }

    for (let i = 0; i < vetoedCellIds.length; i++) {
      const challenge = candidates[i]
      await admin
        .from('lockout_cells')
        .update({
          prompt: challenge.prompt,
          description: challenge.description ?? null,
          replaced_by_veto: true,
        })
        .eq('id', vetoedCellIds[i])
    }

    await admin.from('lockout_pending_vetoes').delete().eq('game_id', game_id)

    return json({ replacedCellIds: vetoedCellIds })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
