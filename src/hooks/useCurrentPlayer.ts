import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ensureAnonymousSession } from '@/lib/auth'
import type { PlayerRow } from '@/types/database'

// Generic: any game needs to know "which player (and team) am I in this
// game", not just Turf War, so this lives outside src/games/.
export function useCurrentPlayer(gameId: string) {
  const [player, setPlayer] = useState<PlayerRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const session = await ensureAnonymousSession()
      if (!session) return

      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (!cancelled) {
        setPlayer(data ?? null)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [gameId])

  return { player, loading }
}
