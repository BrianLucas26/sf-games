import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { GAME_TYPE_CONTENT } from '../../content/game-types'
import { supabase } from '@/lib/supabaseClient'
import { getGameModule } from '@/lib/gameRegistry'
import type { GameRow } from '@/types/database'

interface GameWithType extends GameRow {
  game_types: { slug: string }
}

export default function Play() {
  const { gameId = '' } = useParams()
  const [game, setGame] = useState<GameWithType | null>(null)

  useEffect(() => {
    supabase
      .from('games')
      .select('*, game_types(slug)')
      .eq('id', gameId)
      .single()
      .then(({ data }) => data && setGame(data as unknown as GameWithType))
  }, [gameId])

  if (!game) return <p className="text-sm text-faint">Loading…</p>

  const module = getGameModule(game.game_types.slug)
  if (!module) {
    return <p className="text-sm text-danger">No UI is registered for "{game.game_types.slug}" yet.</p>
  }

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold tracking-tight text-ink">
        {GAME_TYPE_CONTENT[game.game_types.slug]?.name ?? game.game_types.slug}
      </h1>
      <module.Board gameId={gameId} />
    </div>
  )
}
