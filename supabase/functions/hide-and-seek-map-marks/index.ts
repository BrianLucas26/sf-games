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

type MarkOp = 'add' | 'delete' | 'clear'
type MarkKind = 'half_plane' | 'circle' | 'freehand' | 'region'

const MAX_FREEHAND_POINTS = 2000

function isLngLat(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  )
}

// Mirrors the MarkData shapes in src/games/hide-and-seek/types.ts. Rebuilds
// the object from only the known fields, so nothing extra rides along into
// the team's shared markup.
function validateMarkData(kind: MarkKind, data: Record<string, unknown>): Record<string, unknown> | null {
  switch (kind) {
    case 'half_plane':
      if (!isLngLat(data.a) || !isLngLat(data.b)) return null
      if (data.side !== 'left' && data.side !== 'right') return null
      return { a: data.a, b: data.b, side: data.side }
    case 'circle':
      if (!isLngLat(data.center)) return null
      if (typeof data.radius_km !== 'number' || !(data.radius_km > 0 && data.radius_km <= 50)) return null
      if (data.shade !== 'inside' && data.shade !== 'outside') return null
      return { center: data.center, radius_km: data.radius_km, shade: data.shade }
    case 'freehand':
      if (!Array.isArray(data.points) || data.points.length < 2 || data.points.length > MAX_FREEHAND_POINTS) return null
      if (!data.points.every(isLngLat)) return null
      return { points: data.points }
    case 'region':
      if (data.region_set !== 'neighborhoods' && data.region_set !== 'districts') return null
      if (typeof data.region_id !== 'string' || typeof data.name !== 'string') return null
      return { region_set: data.region_set, region_id: data.region_id, name: data.name.slice(0, 100) }
    default:
      return null
  }
}

// The seeking team's shared map markup for the current round: add a shape,
// delete one, or clear them all. Deletes are soft (deleted_at) so the change
// reaches every seeker's map over realtime -- see 0037. Markup is scoped to
// the round, so it starts blank every time the teams swap.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    // Generous: a seeker sketching freehand sends one request per stroke.
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'hide-and-seek-map-marks', 120))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await readBody<{
      game_id: string
      op: MarkOp
      kind: MarkKind
      data: Record<string, unknown>
      mark_id: string
    }>(req)
    const { game_id, op } = body
    if (!game_id || !op) return json({ error: 'game_id and op are required.' }, 400)

    const ctx = await loadRoundContext(admin, game_id, user.id)
    requireRole(ctx, 'seeker')
    requireActiveRound(ctx.round)

    if (op === 'add') {
      if (!body.kind || !body.data || typeof body.data !== 'object') {
        return json({ error: 'kind and data are required.' }, 400)
      }
      const data = validateMarkData(body.kind, body.data)
      if (!data) return json({ error: 'Invalid mark.' }, 400)

      const { data: mark, error } = await admin
        .from('hide_and_seek_map_marks')
        .insert({
          game_id,
          round_id: ctx.round.id,
          team_id: ctx.player.team_id,
          kind: body.kind,
          data,
          created_by_player_id: ctx.player.id,
        })
        .select()
        .single()
      if (error) return json({ error: error.message }, 500)
      return json({ mark })
    }

    const now = new Date().toISOString()

    if (op === 'delete') {
      if (!body.mark_id) return json({ error: 'mark_id is required.' }, 400)
      const { error } = await admin
        .from('hide_and_seek_map_marks')
        .update({ deleted_at: now })
        .eq('id', body.mark_id)
        .eq('round_id', ctx.round.id)
        .eq('team_id', ctx.player.team_id)
        .is('deleted_at', null)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (op === 'clear') {
      const { error } = await admin
        .from('hide_and_seek_map_marks')
        .update({ deleted_at: now })
        .eq('round_id', ctx.round.id)
        .eq('team_id', ctx.player.team_id)
        .is('deleted_at', null)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'Unknown op.' }, 400)
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
