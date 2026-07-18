import type { TeamRow } from '@/types/database'
import type { LockoutCellRow, LockoutGameStateRow } from '../types'

interface LockoutStandingsProps {
  teams: TeamRow[]
  cells: LockoutCellRow[]
  teamColorById: Record<string, string>
  gameState: LockoutGameStateRow | null
  gameEnded: boolean
}

const ENDED_REASON_LABEL: Record<string, string> = {
  bingo: 'got a bingo',
  majority: 'claimed a majority of the board',
  time_limit: 'led when time ran out',
  time_limit_tiebreak: 'was first to reach the tied count',
  sudden_death: 'pulled ahead in sudden death',
}

export function LockoutStandings({ teams, cells, teamColorById, gameState, gameEnded }: LockoutStandingsProps) {
  const winner = teams.find((t) => t.id === gameState?.winner_team_id)

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Standings</h3>
      <ul className="mt-3 space-y-2.5">
        {teams.map((team) => {
          const count = cells.filter((c) => c.claimed_by_team_id === team.id).length
          return (
            <li key={team.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-ink">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: teamColorById[team.id] }}
                />
                {team.name}
              </span>
              <span className="text-muted">{count} claimed</span>
            </li>
          )
        })}
      </ul>

      {gameEnded && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/[0.06] p-3 text-sm text-ink">
          {winner ? (
            <>
              <span className="font-medium">{winner.name}</span> wins
              {gameState?.ended_reason && ENDED_REASON_LABEL[gameState.ended_reason]
                ? ` — ${ENDED_REASON_LABEL[gameState.ended_reason]}.`
                : '.'}
            </>
          ) : (
            "It's a tie."
          )}
        </div>
      )}

      {!gameEnded && gameState?.sudden_death_active && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/[0.08] p-3 text-sm text-ink/90">
          Sudden death — first team to pull ahead wins.
        </div>
      )}
    </div>
  )
}
