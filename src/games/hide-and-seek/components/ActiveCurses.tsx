import { useState } from 'react'
import { Button } from '@/components/Button'
import { formatCountdown, secondsUntil } from '@/lib/time'
import { clearCurse } from '../api'
import { isCurseClearable, type HideAndSeekActiveCurseRow, type HideAndSeekRole } from '../types'
import { CurseTags } from './CurseHand'

interface ActiveCursesProps {
  gameId: string
  // Already filtered to curses still in effect this round.
  curses: HideAndSeekActiveCurseRow[]
  myRole: HideAndSeekRole | null
  onChanged: () => Promise<unknown>
}

// Curses currently in effect on the seekers. Timed ones count down and clear
// themselves; task curses wait for a seeker to tap "Done"; round-long ones
// just stand. Rendered by the board on a ticking `now`, so the countdowns
// here stay live.
export function ActiveCurses({ gameId, curses, myRole, onChanged }: ActiveCursesProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (curses.length === 0) return null

  async function markDone(curse: HideAndSeekActiveCurseRow) {
    setBusyId(curse.id)
    setError(null)
    try {
      await clearCurse({ gameId, activeCurseId: curse.id })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear curse.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-xl border border-danger/40 bg-danger/[0.06] p-4">
      <h3 className="text-xs font-medium tracking-wide text-danger uppercase">
        {myRole === 'seeker' ? "You're cursed" : 'Curses on the seekers'}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {curses.map((curse) => (
          <li key={curse.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-ink">{curse.name}</span>
              {curse.expires_at ? (
                <span className="font-display text-sm tabular-nums text-danger">
                  {formatCountdown(secondsUntil(curse.expires_at))}
                </span>
              ) : (
                <CurseTags
                  clearMode={curse.clear_mode}
                  durationMinutes={curse.duration_minutes}
                  blocksQuestions={curse.blocks_questions}
                />
              )}
            </div>
            <p className="mt-1 text-xs text-muted">{curse.description}</p>

            {curse.benchmark_value && (
              <p className="mt-1.5 text-sm text-ink">
                <span className="text-muted">The hiders' mark: </span>
                <span className="font-medium">{curse.benchmark_value}</span>
              </p>
            )}

            {curse.notes && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-xs text-faint">Fine print</summary>
                <p className="mt-1 text-xs text-muted">{curse.notes}</p>
              </details>
            )}

            {curse.blocks_questions && (
              <p className="mt-1.5 text-xs text-danger">
                {curse.expires_at ? 'No questions until this runs out.' : 'No questions until this is cleared.'}
              </p>
            )}

            {myRole === 'seeker' && isCurseClearable(curse) && (
              <Button
                variant="secondary"
                className="mt-2 w-full py-1.5"
                disabled={busyId !== null}
                onClick={() => markDone(curse)}
              >
                {busyId === curse.id ? 'Clearing…' : 'Done'}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
