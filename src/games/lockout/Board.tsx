import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import { TEAM_COLORS } from '@/lib/teamColors'
import type { TeamRow } from '@/types/database'
import { resolveGame, resolveVetoes, setVetoes } from './api'
import { LockoutCellDetail } from './components/LockoutCellDetail'
import { LockoutGrid } from './components/LockoutGrid'
import { LockoutStandings } from './components/LockoutStandings'
import { LockoutVetoPanel } from './components/LockoutVetoPanel'
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
  const { cells, gameState, gameStatus, myVetoedCellIds, loading, refreshVetoes, refreshGameState, refreshCells } =
    useLockoutRealtime(gameId)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [selectedCell, setSelectedCell] = useState<LockoutCellRow | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [vetoSecondsLeft, setVetoSecondsLeft] = useState(0)
  // Optimistic overlay so a veto toggle feels instant instead of waiting on
  // the edge-function round-trip; cleared once the server echoes it back.
  const [optimisticVetoIds, setOptimisticVetoIds] = useState<string[] | null>(null)
  const resolvedOnceRef = useRef(false)

  const inVetoPhase = Boolean(gameState && !gameState.vetoes_resolved)
  const shownVetoCellIds = optimisticVetoIds ?? myVetoedCellIds

  useEffect(() => {
    supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)
      .order('position')
      .then(({ data }) => data && setTeams(data))
  }, [gameId])

  useEffect(() => {
    if (!gameState) return
    setSecondsLeft(secondsUntil(gameState.round_ends_at))
    resolvedOnceRef.current = false

    const interval = setInterval(() => {
      const remaining = secondsUntil(gameState.round_ends_at)
      setSecondsLeft(remaining)
      if (remaining === 0 && !resolvedOnceRef.current && gameStatus === 'active' && !inVetoPhase) {
        // Fast path: whoever's client notices first resolves it, rather than
        // waiting for the next pg_cron sweep.
        resolvedOnceRef.current = true
        resolveGame(gameId).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState, gameStatus, gameId, inVetoPhase])

  const vetoEndsAt = gameState?.veto_ends_at ?? null
  const vetoesResolved = gameState?.vetoes_resolved ?? true

  useEffect(() => {
    if (!vetoEndsAt || vetoesResolved) return
    setVetoSecondsLeft(secondsUntil(vetoEndsAt))

    let inFlight = false
    let lastAttempt = 0

    const interval = setInterval(async () => {
      const remaining = secondsUntil(vetoEndsAt)
      setVetoSecondsLeft(remaining)
      if (remaining > 0 || inFlight) return

      // Keep retrying rather than latching after one attempt. secondsUntil
      // rounds, so our first call can land a fraction of a second before the
      // deadline the server independently re-checks -- it answers "skipped",
      // and a one-shot attempt would leave the board stuck at 0:00 forever.
      // Clock skew between client and server does the same thing.
      if (Date.now() - lastAttempt < 2000) return
      lastAttempt = Date.now()
      inFlight = true
      try {
        await resolveVetoes(gameId)
        // Don't wait on realtime to observe our own resolution.
        await Promise.all([refreshGameState(), refreshCells()])
      } catch {
        // Retried on the next tick.
      } finally {
        inFlight = false
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [vetoEndsAt, vetoesResolved, gameId, refreshGameState, refreshCells])

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

  async function handleVetoToggle(cell: LockoutCellRow) {
    if (!player?.team_id || !gameState) return
    const alreadyQueued = shownVetoCellIds.includes(cell.id)
    if (!alreadyQueued && shownVetoCellIds.length >= gameState.veto_limit) return

    const nextCellIds = alreadyQueued
      ? shownVetoCellIds.filter((id) => id !== cell.id)
      : [...shownVetoCellIds, cell.id]

    setOptimisticVetoIds(nextCellIds)
    try {
      await setVetoes({ gameId, cellIds: nextCellIds })
      // Re-read our own team's rows rather than waiting on realtime to
      // report our own write -- dropping the optimistic overlay while the
      // subscription is still catching up is what made a toggle appear to
      // snap back to its previous state.
      await refreshVetoes()
    } catch {
      await refreshVetoes()
    } finally {
      setOptimisticVetoIds(null)
    }
  }

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
        {gameState && !gameEnded && !inVetoPhase && (
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
          vetoMode={inVetoPhase}
          myVetoedCellIds={shownVetoCellIds}
        />}
      </div>

      <div className="space-y-4">
        {gameState && inVetoPhase && (
          <LockoutVetoPanel
            secondsLeft={vetoSecondsLeft}
            vetoLimit={gameState.veto_limit}
            myVetoedCount={shownVetoCellIds.length}
            hasTeam={Boolean(player?.team_id)}
          />
        )}

        {gameState && !inVetoPhase && (
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
            player={player}
            teams={teams}
            gameActive={gameStatus === 'active'}
            onClose={() => setSelectedCell(null)}
            vetoMode={inVetoPhase}
            isVetoed={shownVetoCellIds.includes(liveSelectedCell.id)}
            vetoLimit={gameState?.veto_limit ?? 0}
            vetoedCount={shownVetoCellIds.length}
            onToggleVeto={handleVetoToggle}
          />
        )}
      </div>
    </div>
  )
}
