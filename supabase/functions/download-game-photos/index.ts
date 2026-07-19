import { BlobReader, BlobWriter, ZipWriter } from 'jsr:@zip-js/zip-js'
import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'
import { getRequestUser } from '../_shared/getRequestUser.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

// Bundles every gps_photo proof-of-claim for a game into one ZIP, so players
// can pull their photos out (to their phone's camera roll, then wherever
// they like -- Google Drive, etc.) before the game gets swept by
// cleanup-games. Photos are already public URLs (the bucket is public-read),
// so this doesn't cross any confidentiality boundary -- it's just a
// convenience bundle instead of saving each image one at a time on a phone.
function sanitize(name: string): string {
  return name.replace(/[^a-z0-9-]+/gi, '-').replace(/(^-|-$)/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const user = await getRequestUser(req)
    if (!user) return json({ error: 'Sign in (anonymously) first.' }, 401)

    const admin = createServiceRoleClient()
    if (!(await checkRateLimit(admin, `user:${user.id}`, 'download-photos', 5))) {
      return json({ error: 'Too many requests -- slow down.' }, 429)
    }

    const body = await req.json()
    const { game_id } = body as { game_id?: string }
    if (!game_id) return json({ error: 'game_id is required.' }, 400)

    const { data: game } = await admin.from('games').select('join_code').eq('id', game_id).single()
    if (!game) return json({ error: 'Game not found.' }, 404)

    // Only an actual player in this game can pull its photos -- without this,
    // game_id alone (discoverable via the public games table) was enough to
    // trigger a server-side fan-out of every photo fetch + zip compression.
    const { data: player } = await admin
      .from('players')
      .select('id')
      .eq('game_id', game_id)
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!player) return json({ error: 'You are not a player in this game.' }, 403)

    const { data: captures } = await admin
      .from('turf_war_captures')
      .select('photo_url, created_at, zone:turf_war_zones(region:map_regions(name)), team:teams(name)')
      .eq('game_id', game_id)
      .not('photo_url', 'is', null)
      .order('created_at')

    if (!captures || captures.length === 0) {
      return json({ error: 'No photos have been submitted for this game.' }, 404)
    }

    const zipWriter = new ZipWriter(new BlobWriter('application/zip'))
    let index = 0
    for (const capture of captures) {
      index += 1
      const res = await fetch(capture.photo_url as string)
      if (!res.ok) continue
      const blob = await res.blob()

      const regionName = (capture as { zone?: { region?: { name?: string } } }).zone?.region?.name ?? 'unknown'
      const teamName = (capture as { team?: { name?: string } }).team?.name ?? 'team'
      const timestamp = new Date(capture.created_at as string).toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const filename = `${String(index).padStart(2, '0')}-${sanitize(regionName)}-${sanitize(teamName)}-${timestamp}.jpg`

      await zipWriter.add(filename, new BlobReader(blob))
    }
    const zipBlob = await zipWriter.close()

    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="turf-war-${game.join_code}-photos.zip"`,
      },
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
