import { useState } from 'react'
import { Button } from '@/components/Button'
import type { PlayerRow, TeamRow } from '@/types/database'
import { claimCell, undoClaim } from '../api'
import type { LockoutCellRow } from '../types'

interface LockoutCellDetailProps {
  gameId: string
  cell: LockoutCellRow
  challenge?: string
  player: PlayerRow
  teams: TeamRow[]
  gameActive: boolean
  onClose: () => void
}

export function LockoutCellDetail({
  gameId,
  cell,
  challenge,
  player,
  teams,
  gameActive,
  onClose,
}: LockoutCellDetailProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const claimingTeam = teams.find((t) => t.id === cell.claimed_by_team_id)
  const isMyTeamsCell = Boolean(player.team_id && cell.claimed_by_team_id === player.team_id)
  const claimable = gameActive && !cell.claimed_by_team_id && Boolean(player.team_id)
  const undoable = gameActive && isMyTeamsCell

  async function handleClaim() {
    setBusy(true)
    setError(null)
    try {
      await claimCell({ gameId, cellId: cell.id })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim this cell.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUndo() {
    setBusy(true)
    setError(null)
    try {
      await undoClaim({ gameId, cellId: cell.id })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to undo this claim.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-display font-medium text-ink">Challenge #{cell.position + 1}</h3>
        <button onClick={onClose} className="text-xs text-faint transition-colors hover:text-muted">
          Close
        </button>
      </div>
      <p className="mt-1 text-xs tracking-wide text-muted">
        {claimingTeam ? `Claimed by ${claimingTeam.name}` : 'Unclaimed'}
      </p>
      {challenge && <p className="mt-3 text-sm leading-relaxed text-ink/80">{challenge}</p>}

      {!player.team_id && !cell.claimed_by_team_id && (
        <p className="mt-3 text-xs text-accent">Join a team before claiming a cell.</p>
      )}

      {claimable && (
        <div className="mt-4 space-y-3">
          <Button onClick={handleClaim} disabled={busy} className="w-full">
            {busy ? 'Claiming…' : 'Claim this challenge'}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}

      {undoable && (
        <div className="mt-4 space-y-3">
          <Button variant="secondary" onClick={handleUndo} disabled={busy} className="w-full">
            {busy ? 'Undoing…' : 'Undo claim'}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
