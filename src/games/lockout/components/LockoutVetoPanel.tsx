function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface LockoutVetoPanelProps {
  secondsLeft: number
  vetoLimit: number
  myVetoedCount: number
  hasTeam: boolean
}

// Shown in place of the standings/detail panel during the veto phase. Each
// team's picks are entirely their own -- this panel never shows anything
// about the other team's progress, by design (fully hidden until reveal).
export function LockoutVetoPanel({ secondsLeft, vetoLimit, myVetoedCount, hasTeam }: LockoutVetoPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Veto period</h3>
      <p className="mt-2 text-sm text-muted">
        Time left: <span className="font-display tabular-nums text-ink">{formatDuration(secondsLeft)}</span>
      </p>

      {vetoLimit > 0 ? (
        <>
          <p className="mt-3 text-sm text-ink/80">
            Study the board, then tap up to {vetoLimit} challenge{vetoLimit === 1 ? '' : 's'} to veto. Vetoed
            challenges get swapped for something else once the timer runs out -- your team won't see what the
            other team picks.
          </p>
          <p className="mt-3 text-sm font-medium text-ink">
            Your picks: {myVetoedCount} / {vetoLimit}
          </p>
          {!hasTeam && <p className="mt-2 text-xs text-accent">Join a team to veto challenges.</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink/80">
          Vetoes are disabled this game -- use this time to study the board before claiming opens.
        </p>
      )}
    </div>
  )
}
