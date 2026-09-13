import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useResumeEpoch } from '@/hooks/useResumeEpoch'
import type { GameStatus } from '@/types/database'
import type { LockoutCellRow, LockoutGameStateRow } from '../types'

// Subscribes to the things the board needs live: cell claims, game state
// (sudden death flag, winner once decided, veto phase), the game's own
// status (so the win/tie banner appears the instant the game ends, however
// it ended -- claim-triggered or time-limit-triggered), and the caller's
// own team's pending vetoes (RLS scopes this select to the caller's team --
// see 0035 -- so no team_id filter is needed here).
//
// The loaders are returned as well as subscribed: a client must not rely on
// realtime to observe its OWN action (same reason Lobby.tsx re-loads after
// selectTeam).
export function useLockoutRealtime(gameId: string) {
  const [cells, setCells] = useState<LockoutCellRow[]>([])
  const [gameState, setGameState] = useState<LockoutGameStateRow | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null)
  const [myVetoedCellIds, setMyVetoedCellIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const resumeEpoch = useResumeEpoch()

  const loadCells = useCallback(async () => {
    const { data } = await supabase.from('lockout_cells').select('*').eq('game_id', gameId)
    if (data) setCells(data)
  }, [gameId])

  const loadGameState = useCallback(async () => {
    const { data } = await supabase
      .from('lockout_game_state')
      .select('*')
      .eq('game_id', gameId)
      .maybeSingle()
    setGameState(data)
  }, [gameId])

  const loadGameStatus = useCallback(async () => {
    const { data } = await supabase.from('games').select('status').eq('id', gameId).maybeSingle()
    if (data) setGameStatus(data.status)
  }, [gameId])

  const loadMyPendingVetoes = useCallback(async () => {
    const { data } = await supabase.from('lockout_pending_vetoes').select('cell_id').eq('game_id', gameId)
    setMyVetoedCellIds((data ?? []).map((row) => row.cell_id as string))
  }, [gameId])

  useEffect(() => {
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lockout_pending_vetoes', filter: `game_id=eq.${gameId}` },
        loadMyPendingVetoes,
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        // Fires on the first join AND on every automatic rejoin after the
        // socket drops, so this is both the initial load and the reconnect
        // resync -- postgres_changes never replays what was missed while the
        // connection was down, which is why a backgrounded phone used to come
        // back showing a stale board until the player hand-refreshed.
        //
        // Loading here rather than before .subscribe() also closes the race
        // where a change lands between the query returning and the channel
        // finishing establishing.
        Promise.all([loadCells(), loadGameState(), loadGameStatus(), loadMyPendingVetoes()]).then(
          () => setLoading(false),
        )
      })

    return () => {
      supabase.removeChannel(channel)
    }
    // resumeEpoch: rebuild the channel when the page returns to the
    // foreground, rather than waiting up to a heartbeat for realtime-js to
    // notice the socket died while we were frozen.
  }, [gameId, resumeEpoch, loadCells, loadGameState, loadGameStatus, loadMyPendingVetoes])

  return {
    cells,
    gameState,
    gameStatus,
    myVetoedCellIds,
    loading,
    refreshVetoes: loadMyPendingVetoes,
    refreshGameState: loadGameState,
    refreshCells: loadCells,
  }
}
