import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { downloadFunctionFile } from '@/lib/functions'

interface PhotoDownloadButtonProps {
  gameId: string
  joinCode: string
}

// Bundles every gps_photo proof-of-claim into a ZIP a player can save
// straight to their phone -- mainly so photos survive the cleanup-games
// sweep (12h after a finished game) instead of only living in Supabase
// Storage. Hidden entirely when the game has no photos (verification_mode
// was 'none'/'gps', or nobody's claimed anything yet).
export function PhotoDownloadButton({ gameId, joinCode }: PhotoDownloadButtonProps) {
  const [photoCount, setPhotoCount] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('turf_war_captures')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .not('photo_url', 'is', null)
      .then(({ count }) => {
        if (!cancelled) setPhotoCount(count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      await downloadFunctionFile(
        'download-game-photos',
        { game_id: gameId },
        `turf-war-${joinCode}-photos.zip`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download photos.')
    } finally {
      setDownloading(false)
    }
  }

  if (!photoCount) return null

  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full rounded-md bg-gray-800 py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {downloading
          ? 'Preparing your photos... this can take a moment on mobile data'
          : `Download ${photoCount} photo${photoCount === 1 ? '' : 's'} (.zip)`}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
