import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { GameStatus } from '@/types/database'
import type { LockoutCellRow, LockoutGameStateRow } from '../types'

// Subscribes to the three things the board needs live: cell claims, game
// state (sudden death flag, winner once decided), and the game's own status
// (so the win/tie banner appears the instant the game ends, however it
// ended -- claim-triggered or time-limit-triggered).
export function useLockoutRealtime(gameId: string) {
  const [cells, setCells] = useState<LockoutCellRow[]>([])
  const [gameState, setGameState] = useState<LockoutGameStateRow | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCells() {
      const { data } = await supabase.from('lockout_cells').select('*').eq('game_id', gameId)
      if (!cancelled && data) setCells(data)
    }

    async function loadGameState() {
      const { data } = await supabase
        .from('lockout_game_state')
        .select('*')
        .eq('game_id', gameId)
        .maybeSingle()
      if (!cancelled) setGameState(data)
    }

    async function loadGameStatus() {
      const { data } = await supabase.from('games').select('status').eq('id', gameId).maybeSingle()
      if (!cancelled && data) setGameStatus(data.status)
    }

    Promise.all([loadCells(), loadGameState(), loadGameStatus()]).then(() => {
      if (!cancelled) setLoading(false)
    })

    const channel = supabase
      .channel(`lockout-board-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lockout_cells', filter: `game_id=eq.${gameId}` },
        loadCells,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lockout_game_state', filter: `game_id=eq.${gameId}` },
        loadGameState,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        loadGameStatus,
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [gameId])

  return { cells, gameState, gameStatus, loading }
}
