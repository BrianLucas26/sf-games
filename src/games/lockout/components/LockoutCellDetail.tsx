import { useState } from 'react'
import { Button } from '@/components/Button'
import type { PlayerRow, TeamRow } from '@/types/database'
import { claimCell, undoClaim } from '../api'
import type { LockoutCellRow } from '../types'

interface LockoutCellDetailProps {
  gameId: string
  cell: LockoutCellRow
  player: PlayerRow
  teams: TeamRow[]
  gameActive: boolean
  onClose: () => void
  vetoMode?: boolean
  isVetoed?: boolean
  vetoLimit?: number
  vetoedCount?: number
  onToggleVeto?: (cell: LockoutCellRow) => void
}

export function LockoutCellDetail({
  gameId,
  cell,
  player,
  teams,
  gameActive,
  onClose,
  vetoMode = false,
  isVetoed = false,
  vetoLimit = 0,
  vetoedCount = 0,
  onToggleVeto,
}: LockoutCellDetailProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const claimingTeam = teams.find((t) => t.id === cell.claimed_by_team_id)
  const isMyTeamsCell = Boolean(player.team_id && cell.claimed_by_team_id === player.team_id)
  const claimable = !vetoMode && gameActive && !cell.claimed_by_team_id && Boolean(player.team_id)
  const undoable = !vetoMode && gameActive && isMyTeamsCell
  const atVetoLimit = !isVetoed && vetoedCount >= vetoLimit

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
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-medium text-ink">{cell.prompt}</h3>
        <button onClick={onClose} className="shrink-0 text-xs text-faint transition-colors hover:text-muted">
          Close
        </button>
      </div>
      <p className="mt-1 text-xs tracking-wide text-muted">
        {vetoMode ? (isVetoed ? 'Queued for veto' : 'Not vetoed') : claimingTeam ? `Claimed by ${claimingTeam.name}` : 'Unclaimed'}
      </p>
      {cell.replaced_by_veto && <p className="mt-1 text-xs text-danger">Swapped after a veto</p>}
      {cell.description && <p className="mt-3 text-sm leading-relaxed text-ink/80">{cell.description}</p>}

      {!player.team_id && !vetoMode && !cell.claimed_by_team_id && (
        <p className="mt-3 text-xs text-accent">Join a team before claiming a cell.</p>
      )}

      {vetoMode && (
        <div className="mt-4 space-y-3">
          {!player.team_id ? (
            <p className="text-xs text-accent">Join a team before vetoing a challenge.</p>
          ) : (
            <>
              <Button
                variant={isVetoed ? 'secondary' : 'danger'}
                onClick={() => onToggleVeto?.(cell)}
                disabled={atVetoLimit}
                className="w-full"
              >
                {isVetoed ? 'Remove veto' : 'Veto this challenge'}
              </Button>
              {atVetoLimit && (
                <p className="text-xs text-faint">
                  You've used all {vetoLimit} veto{vetoLimit === 1 ? '' : 'es'} — remove one to pick another.
                </p>
              )}
            </>
          )}
        </div>
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
