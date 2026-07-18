import { corsHeaders } from '../_shared/cors.ts'
import { json } from '../_shared/response.ts'
import { createServiceRoleClient } from '../_shared/supabaseAdmin.ts'

const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET')
const PHOTO_BUCKET = 'turf-war-claim-photos'

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  return url.slice(index + marker.length)
}

// Called on a schedule by .github/workflows/cleanup-stale-games.yml, not by
// players -- authenticated via a shared secret header since there's no
// logged-in user driving this. For each stale game (per the stale_game_ids()
// RPC, see 0015_cleanup_games_edge.sql): delete its claim photos from
// Storage first, then delete the games row (cascades teams/players/every
// per-game-type instance table). Doing both together, in this order, is the
// whole reason this moved out of a pure-SQL pg_cron job -- plain SQL can
// delete storage.objects metadata rows but can't remove the actual files.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  if (!CLEANUP_SECRET || req.headers.get('X-Cleanup-Secret') !== CLEANUP_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const admin = createServiceRoleClient()

    const { data: staleRows, error: staleError } = await admin.rpc('stale_game_ids')
    if (staleError) return json({ error: staleError.message }, 500)

    const staleIds = (staleRows ?? []).map((row) =>
      typeof row === 'string' ? row : (row as { stale_game_ids: string }).stale_game_ids,
    )

    const results: { gameId: string; photosDeleted: number }[] = []

    for (const gameId of staleIds) {
      const { data: captures } = await admin
        .from('turf_war_captures')
        .select('photo_url')
        .eq('game_id', gameId)
        .not('photo_url', 'is', null)

      const paths = (captures ?? [])
        .map((c) => storagePathFromPublicUrl(c.photo_url as string))
        .filter((p): p is string => p !== null)

      if (paths.length > 0) {
        await admin.storage.from(PHOTO_BUCKET).remove(paths)
      }

      await admin.from('games').delete().eq('id', gameId)
      results.push({ gameId, photosDeleted: paths.length })
    }

    return json({ cleaned: results.length, results })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
