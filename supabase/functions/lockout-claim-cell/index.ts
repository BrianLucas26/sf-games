import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

function hasBingoLine(positions: Set<number>, boardSize: number): boolean {
  for (let r = 0; r < boardSize; r++) {
    let complete = true
    for (let c = 0; c < boardSize; c++) {
      if (!positions.has(r * boardSize + c)) {
        complete = false
        break
      }
    }
    if (complete) return true
  }

  for (let c = 0; c < boardSize; c++) {
    let complete = true
    for (let r = 0; r < boardSize; r++) {
      if (!positions.has(r * boardSize + c)) {
        complete = false
        break
      }
    }
    if (complete) return true
  }

  let diag1 = true
  let diag2 = true
  for (let i = 0; i < boardSize; i++) {
    if (!positions.has(i * boardSize + i)) diag1 = false
    if (!positions.has(i * boardSize + (boardSize - 1 - i))) diag2 = false
  }
  return diag1 || diag2
}

// Handles claim + synchronous win-check in one endpoint: bingo/majority wins
// are decided the instant the deciding cell is claimed (no polling), and a
// sudden-death win (once lockout_resolve_game has flagged it) is checked the
// same way -- the claiming team wins the moment it pulls ahead.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'claim-cell', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await req.json()
    const { game_id, cell_id } = body as { game_id?: string; cell_id?: string }
    if (!game_id || !cell_id) return json({ error: 'game_id and cell_id are required.' }, 400)

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
    if (!player.team_id) return json({ error: 'Join a team before claiming a cell.' }, 400)

    const { data: gameState } = await admin
      .from('lockout_game_state')
      .select('board_size, game_mode, sudden_death_active')
      .eq('game_id', game_id)
      .single()
    if (!gameState) return json({ error: 'Game state not found.' }, 500)

    const { data: cell } = await admin
      .from('lockout_cells')
      .select('id')
      .eq('id', cell_id)
      .eq('game_id', game_id)
      .single()
    if (!cell) return json({ error: 'Cell not found.' }, 404)

    // Atomic guard: the WHERE on claimed_by_team_id prevents two racing
    // claims from both succeeding.
    const { data: claimedCell, error: claimError } = await admin
      .from('lockout_cells')
      .update({
        claimed_by_team_id: player.team_id,
        claimed_by_player_id: player.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', cell_id)
      .is('claimed_by_team_id', null)
      .select()
      .maybeSingle()
    if (claimError) return json({ error: claimError.message }, 500)
    if (!claimedCell) return json({ error: 'Someone else just claimed this cell.' }, 409)

    const { data: myCells } = await admin
      .from('lockout_cells')
      .select('position')
      .eq('game_id', game_id)
      .eq('claimed_by_team_id', player.team_id)
    const myPositions = new Set((myCells ?? []).map((c) => c.position))

    let won = false
    let endedReason: string | null = null

    if (gameState.game_mode === 'bingo') {
      won = hasBingoLine(myPositions, gameState.board_size)
      endedReason = 'bingo'
    } else {
      const threshold = Math.floor(gameState.board_size * gameState.board_size / 2) + 1
      won = myPositions.size >= threshold
      endedReason = 'majority'
    }

    if (!won && gameState.sudden_death_active) {
      const { data: allCells } = await admin
        .from('lockout_cells')
        .select('claimed_by_team_id')
        .eq('game_id', game_id)
        .not('claimed_by_team_id', 'is', null)
      const counts = new Map<string, number>()
      for (const c of allCells ?? []) {
        const teamId = c.claimed_by_team_id as string
        counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
      }
      const myCount = counts.get(player.team_id) ?? 0
      const otherCount = Math.max(0, ...[...counts.entries()]
        .filter(([teamId]) => teamId !== player.team_id)
        .map(([, count]) => count))
      if (myCount > otherCount) {
        won = true
        endedReason = 'sudden_death'
      }
    }

    if (won) {
      await admin
        .from('games')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', game_id)
      await admin
        .from('lockout_game_state')
        .update({ winner_team_id: player.team_id, ended_reason: endedReason })
        .eq('game_id', game_id)
    }

    return json({ cell: claimedCell, won, winnerTeamId: won ? player.team_id : null })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
