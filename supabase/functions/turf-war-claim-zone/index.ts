import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { haversineDistanceMeters } from '../_shared/haversine.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

// Handles both claim paths in one endpoint (the client just says "I'm
// claiming zone X" and the server figures out which applies), rather than a
// separate turf-war-claim-secret-zone function -- the verification-mode
// checks are identical either way, so splitting them would just duplicate
// that logic:
//   - public: zone.status === 'open'
//   - secret: zone.status === 'locked' AND the caller's team has an
//     unclaimed turf_war_secret_zones row pointing at it
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'claim-zone', 20))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await req.json()
    const { game_id, zone_id, lat, lng, photo_url } = body as {
      game_id?: string
      zone_id?: string
      lat?: number
      lng?: number
      photo_url?: string
    }
    if (!game_id || !zone_id) return json({ error: 'game_id and zone_id are required.' }, 400)

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
    if (!player.team_id) return json({ error: 'Join a team before claiming a zone.' }, 400)

    const { data: gameState } = await admin
      .from('turf_war_game_state')
      .select('verification_mode, gps_threshold_meters')
      .eq('game_id', game_id)
      .single()
    if (!gameState) return json({ error: 'Game state not found.' }, 500)

    const { data: zone } = await admin
      .from('turf_war_zones')
      .select('id, region_id, status')
      .eq('id', zone_id)
      .eq('game_id', game_id)
      .single()
    if (!zone) return json({ error: 'Zone not found.' }, 404)

    let secretZoneId: string | null = null
    if (zone.status === 'open') {
      // public path
    } else if (zone.status === 'locked') {
      const { data: secretZone } = await admin
        .from('turf_war_secret_zones')
        .select('id')
        .eq('game_id', game_id)
        .eq('team_id', player.team_id)
        .eq('zone_id', zone_id)
        .is('claimed_at', null)
        .maybeSingle()
      if (!secretZone) return json({ error: 'This zone is not currently claimable.' }, 400)
      secretZoneId = secretZone.id
    } else {
      return json({ error: 'This zone is not currently claimable.' }, 400)
    }

    if (gameState.verification_mode === 'gps' || gameState.verification_mode === 'gps_photo') {
      if (lat == null || lng == null) {
        return json({ error: 'Location is required to claim this zone.' }, 400)
      }
      if (gameState.verification_mode === 'gps_photo' && !photo_url) {
        return json({ error: 'A photo is required to claim this zone.' }, 400)
      }
    }

    let distanceMeters: number | null = null
    if (gameState.verification_mode !== 'none') {
      const { data: region } = await admin
        .from('map_regions')
        .select('centroid_lat, centroid_lng')
        .eq('id', zone.region_id)
        .single()
      if (!region) return json({ error: 'Neighborhood data missing for this zone.' }, 500)

      distanceMeters = haversineDistanceMeters(lat!, lng!, region.centroid_lat, region.centroid_lng)
      const threshold = gameState.gps_threshold_meters ?? 100
      if (distanceMeters > threshold) {
        return json(
          { error: `Too far from the neighborhood (${Math.round(distanceMeters)}m away, need <= ${threshold}m).` },
          400,
        )
      }
    }

    // Atomic guard: the WHERE on status prevents two racing claims from both succeeding.
    const { data: claimedZone, error: claimError } = await admin
      .from('turf_war_zones')
      .update({ status: 'claimed', owning_team_id: player.team_id, claimed_at: new Date().toISOString() })
      .eq('id', zone_id)
      .eq('status', zone.status)
      .select()
      .maybeSingle()
    if (claimError) return json({ error: claimError.message }, 500)
    if (!claimedZone) return json({ error: 'Someone else just claimed this zone.' }, 409)

    if (secretZoneId) {
      await admin
        .from('turf_war_secret_zones')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', secretZoneId)
    }

    const { data: capture, error: captureError } = await admin
      .from('turf_war_captures')
      .insert({
        game_id,
        zone_id,
        team_id: player.team_id,
        player_id: player.id,
        verification_mode: gameState.verification_mode,
        submitted_lat: lat ?? null,
        submitted_lng: lng ?? null,
        distance_meters: distanceMeters,
        photo_url: photo_url ?? null,
      })
      .select()
      .single()
    if (captureError || !capture) {
      return json({ error: captureError?.message ?? 'Failed to record capture' }, 500)
    }

    // Only public claims deplete the open pool -- secret zones go straight
    // from 'locked' to 'claimed' without ever being 'open'.
    if (!secretZoneId) {
      await admin.rpc('turf_war_replenish_open_zones', { p_game_id: game_id })
    }

    return json({ zone: claimedZone, capture })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
