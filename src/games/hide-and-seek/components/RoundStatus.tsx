import { useState } from 'react'
import { Button } from '@/components/Button'
import { formatCountdown, secondsUntil } from '@/lib/time'
import type { TeamRow } from '@/types/database'
import { foundAction, startNextRound } from '../api'
import { liveHideSeconds } from '../clock'
import type { HideAndSeekGameStateRow, HideAndSeekRole, HideAndSeekRoundRow } from '../types'

interface RoundStatusProps {
  gameId: string
  round: HideAndSeekRoundRow
  gameState: HideAndSeekGameStateRow
  teamsById: Record<string, TeamRow>
  teamColorById: Record<string, string>
  myRole: HideAndSeekRole | null
  gameEnded: boolean
  now: number
  onChanged: () => Promise<unknown>
}

// Under five minutes left on a countdown, it turns urgent -- same threshold
// as Turf War's RoundTimer.
const URGENT_SECONDS = 5 * 60

function TeamName({ team, color }: { team: TeamRow | undefined; color: string | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-ink">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {team?.name ?? 'Team'}
    </span>
  )
}

export function RoundStatus({
  gameId,
  round,
  gameState,
  teamsById,
  teamColorById,
  myRole,
  gameEnded,
  now,
  onChanged,
}: RoundStatusProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hiders = teamsById[round.hider_team_id]
  const seekers = teamsById[round.seeker_team_id]
  const hiding = round.status === 'active' && now < new Date(round.hiding_ends_at).getTime()
  const seeking = round.status === 'active' && !hiding
  const claimPending = seeking && Boolean(round.found_claimed_at)
  const isLastRound = round.round_number >= gameState.total_rounds

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const hidingLeft = secondsUntil(round.hiding_ends_at)
  const hideSeconds = liveHideSeconds(round, now)
  const seekCapLeft = round.seek_ends_at ? secondsUntil(round.seek_ends_at) : null

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">
          Round {round.round_number} of {gameState.total_rounds}
        </h3>
        {myRole && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              myRole === 'hider' ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-ink'
            }`}
          >
            You're {myRole === 'hider' ? 'hiding' : 'seeking'}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-muted">
        <TeamName team={hiders} color={teamColorById[round.hider_team_id]} /> hides ·{' '}
        <TeamName team={seekers} color={teamColorById[round.seeker_team_id]} /> seeks
      </p>

      {hiding && (
        <div className="mt-3">
          <p className="text-xs text-muted">Hiding period</p>
          <p className={`font-display text-3xl tabular-nums ${hidingLeft <= 60 ? 'text-danger' : 'text-ink'}`}>
            {formatCountdown(hidingLeft)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {myRole === 'hider'
              ? 'Get to your hiding spot before the clock runs out.'
              : myRole === 'seeker'
                ? 'Stay put -- you can start searching and asking questions when this hits zero.'
                : 'Seeking starts when this hits zero.'}
          </p>
        </div>
      )}

      {seeking && (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{claimPending ? 'Hide time (stopped at the find)' : 'Hide time'}</p>
            <p className="font-display text-3xl tabular-nums text-ink">{formatCountdown(hideSeconds)}</p>
          </div>
          {seekCapLeft !== null && !claimPending && (
            <div className="text-right">
              <p className="text-xs text-muted">Seek limit</p>
              <p
                className={`font-display text-lg tabular-nums ${seekCapLeft <= URGENT_SECONDS ? 'text-danger' : 'text-ink'}`}
              >
                {seekCapLeft === 0 ? "Time's up…" : formatCountdown(seekCapLeft)}
              </p>
            </div>
          )}
        </div>
      )}

      {seeking && myRole === 'seeker' && !claimPending && (
        <Button
          className="mt-3 w-full"
          disabled={busy}
          onClick={() => {
            if (confirm('Found the hiders? This stops the clock and asks them to confirm.')) {
              run(() => foundAction({ gameId, action: 'claim' }))
            }
          }}
        >
          Found them!
        </Button>
      )}

      {claimPending && myRole === 'seeker' && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/[0.06] p-3 text-sm text-ink">
          <span>Waiting for the hiders to confirm…</span>
          <Button variant="ghost" className="px-2 py-1 text-xs" disabled={busy} onClick={() => run(() => foundAction({ gameId, action: 'reject' }))}>
            Cancel
          </Button>
        </div>
      )}

      {claimPending && myRole === 'hider' && (
        <div className="mt-3 space-y-2.5 rounded-lg border border-danger/40 bg-danger/[0.08] p-3 text-sm text-ink">
          <p className="font-medium">The seekers say they found you!</p>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => run(() => foundAction({ gameId, action: 'confirm' }))}>
              Yes, we're found
            </Button>
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => run(() => foundAction({ gameId, action: 'reject' }))}>
              Not us
            </Button>
          </div>
        </div>
      )}

      {claimPending && !myRole && <p className="mt-3 text-sm text-muted">Find claimed -- waiting for the hiders to confirm.</p>}

      {round.status === 'completed' && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink">
            <span className="font-medium">{hiders?.name}</span> hid for{' '}
            <span className="font-display tabular-nums">{formatCountdown(round.hide_seconds ?? 0)}</span>
            {round.end_reason === 'time_cap' ? ' -- the seek limit ran out.' : '.'}
          </p>
          {!gameEnded && !isLastRound && (
            <>
              <Button
                className="w-full"
                disabled={busy || !myRole}
                onClick={() => run(() => startNextRound(gameId))}
              >
                Start round {round.round_number + 1} -- {seekers?.name} hides
              </Button>
              <p className="text-xs text-faint">
                The {gameState.hiding_period_minutes}-minute hiding period starts as soon as anyone presses this.
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
