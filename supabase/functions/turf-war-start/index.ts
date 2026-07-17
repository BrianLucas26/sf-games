import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'

const REGION_SET_SLUG = 'sf-neighborhoods'

interface TurfWarSettings {
  open_slot_target: number
  secret_interval_minutes: number
  duration_minutes: number
  verification_mode: 'none' | 'gps' | 'gps_photo'
  gps_threshold_meters: number | null
}

const DEFAULTS: TurfWarSettings = {
  open_slot_target: 5,
  secret_interval_minutes: 15,
  duration_minutes: 180,
  verification_mode: 'none',
  gps_threshold_meters: 100,
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Host-only: seeds turf_war_zones for every neighborhood (shuffled draw
// order), opens the first X, writes turf_war_game_state, and flips the game
// to 'active'. Enforces exactly 2 teams here (a Turf War rule, not a
// `teams` table constraint, since other game types may allow more).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const body = await req.json()
    const { game_id } = body as { game_id?: string }
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const admin = createServiceRoleClient()

    const { data: game, error: gameError } = await admin
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single()
    if (gameError || !game) return json({ error: 'Game not found.' }, 404)
    if (game.host_id !== user.id) return json({ error: 'Only the host can start the game.' }, 403)
    if (game.status !== 'lobby') return json({ error: 'Game has already started.' }, 400)

    const { data: teams, error: teamsError } = await admin
      .from('teams')
      .select('id')
      .eq('game_id', game_id)
    if (teamsError) return json({ error: teamsError.message }, 500)
    if (!teams || teams.length !== 2) {
      return json({ error: 'Turf War requires exactly 2 teams.' }, 400)
    }

    const settings: TurfWarSettings = { ...DEFAULTS, ...(game.settings ?? {}) }

    const { data: regionSet, error: regionSetError } = await admin
      .from('map_region_sets')
      .select('id')
      .eq('slug', REGION_SET_SLUG)
      .maybeSingle()
    if (regionSetError) return json({ error: regionSetError.message }, 500)
    if (!regionSet) {
      return json(
        { error: `Region set '${REGION_SET_SLUG}' has not been seeded yet.` },
        500,
      )
    }

    const { data: regions, error: regionsError } = await admin
      .from('map_regions')
      .select('id')
      .eq('region_set_id', regionSet.id)
    if (regionsError) return json({ error: regionsError.message }, 500)
    if (!regions || regions.length === 0) {
      return json(
        { error: `No neighborhoods seeded for region set '${REGION_SET_SLUG}' yet.` },
        500,
      )
    }

    const shuffled = shuffle(regions)
    const zoneRows = shuffled.map((region, index) => ({
      game_id,
      region_id: region.id,
      draw_position: index,
      status: 'locked' as const,
    }))

    const { error: insertZonesError } = await admin.from('turf_war_zones').insert(zoneRows)
    if (insertZonesError) return json({ error: insertZonesError.message }, 500)

    const openSlotTarget = Math.min(settings.open_slot_target, shuffled.length)
    const { error: openError } = await admin
      .from('turf_war_zones')
      .update({ status: 'open', opened_at: new Date().toISOString() })
      .eq('game_id', game_id)
      .lt('draw_position', openSlotTarget)
    if (openError) return json({ error: openError.message }, 500)

    const startedAt = new Date()
    const roundEndsAt = new Date(startedAt.getTime() + settings.duration_minutes * 60_000)

    const { error: stateError } = await admin.from('turf_war_game_state').insert({
      game_id,
      open_slot_target: openSlotTarget,
      secret_interval_minutes: settings.secret_interval_minutes,
      verification_mode: settings.verification_mode,
      gps_threshold_meters: settings.gps_threshold_meters,
      round_ends_at: roundEndsAt.toISOString(),
      last_secret_tick_at: startedAt.toISOString(),
    })
    if (stateError) return json({ error: stateError.message }, 500)

    const { data: updatedGame, error: updateGameError } = await admin
      .from('games')
      .update({ status: 'active', started_at: startedAt.toISOString() })
      .eq('id', game_id)
      .select()
      .single()
    if (updateGameError || !updatedGame) {
      return json({ error: updateGameError?.message ?? 'Failed to start game' }, 500)
    }

    return json({ game: updatedGame })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
