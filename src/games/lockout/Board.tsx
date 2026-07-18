import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import { TEAM_COLORS } from '@/lib/teamColors'
import type { TeamRow } from '@/types/database'
import { resolveGame } from './api'
import { LockoutCellDetail } from './components/LockoutCellDetail'
import { LockoutGrid } from './components/LockoutGrid'
import { LockoutStandings } from './components/LockoutStandings'
import { useLockoutRealtime } from './hooks/useLockoutRealtime'
import type { LockoutCellRow } from './types'

function secondsUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000))
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Board({ gameId }: { gameId: string }) {
  const { player } = useCurrentPlayer(gameId)
  const { cells, gameState, gameStatus, loading } = useLockoutRealtime(gameId)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [selectedCell, setSelectedCell] = useState<LockoutCellRow | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const resolvedOnceRef = useRef(false)

  useEffect(() => {
    supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at')
      .then(({ data }) => data && setTeams(data))
  }, [gameId])

  useEffect(() => {
    if (!gameState) return
    setSecondsLeft(secondsUntil(gameState.round_ends_at))
    resolvedOnceRef.current = false

    const interval = setInterval(() => {
      const remaining = secondsUntil(gameState.round_ends_at)
      setSecondsLeft(remaining)
      if (remaining === 0 && !resolvedOnceRef.current && gameStatus === 'active') {
        // Fast path: whoever's client notices first resolves it, rather than
        // waiting for the next pg_cron sweep.
        resolvedOnceRef.current = true
        resolveGame(gameId).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, gameStatus, gameId])

  const teamColorById = useMemo(() => {
    const map: Record<string, string> = {}
    teams.forEach((t, i) => {
      map[t.id] = TEAM_COLORS[i % TEAM_COLORS.length]
    })
    return map
  }, [teams])

  // Keep the selected cell in sync with realtime updates (e.g. the other
  // team claims it while its detail panel is open).
  const liveSelectedCell = selectedCell ? cells.find((c) => c.id === selectedCell.id) ?? null : null

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  const gameEnded = gameStatus === 'completed'

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-3">
        {gameState && !gameEnded && (
          <p className="text-sm text-muted">
            Time left: <span className="font-display tabular-nums text-ink">{formatDuration(secondsLeft)}</span>
          </p>
        )}
        {gameState && <LockoutGrid
          cells={cells}
          boardSize={gameState.board_size}
          teamColorById={teamColorById}
          selectedCellId={selectedCell?.id ?? null}
          onSelect={setSelectedCell}
        />}
      </div>

      <div className="space-y-4">
        {gameState && (
          <LockoutStandings
            teams={teams}
            cells={cells}
            teamColorById={teamColorById}
            gameState={gameState}
            gameEnded={gameEnded}
          />
        )}

        {liveSelectedCell && player && (
          <LockoutCellDetail
            gameId={gameId}
            cell={liveSelectedCell}
            challenge={liveSelectedCell.prompt}
            player={player}
            teams={teams}
            gameActive={gameStatus === 'active'}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </div>
    </div>
  )
}
