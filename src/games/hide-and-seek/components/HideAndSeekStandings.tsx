import { formatCountdown } from '@/lib/time'
import type { TeamRow } from '@/types/database'
import { liveHideSeconds } from '../clock'
import type { HideAndSeekGameStateRow, HideAndSeekRoundRow } from '../types'

interface HideAndSeekStandingsProps {
  teams: TeamRow[]
  rounds: HideAndSeekRoundRow[]
  gameState: HideAndSeekGameStateRow
  teamColorById: Record<string, string>
  gameEnded: boolean
  now: number
}

const WIN_CONDITION_LABEL = {
  total_time: 'Longest total hide time wins',
  longest_single: 'Longest single hide wins',
} as const

// Per-round hide times plus each team's score under the game's win
// condition. The live round's time ticks along with the board clock.
export function HideAndSeekStandings({ teams, rounds, gameState, teamColorById, gameEnded, now }: HideAndSeekStandingsProps) {
  const winner = teams.find((t) => t.id === gameState.winner_team_id)

  const scoreFor = (teamId: string) => {
    const times = rounds.filter((r) => r.hider_team_id === teamId).map((r) => liveHideSeconds(r, now))
    if (times.length === 0) return 0
    return gameState.win_condition === 'longest_single' ? Math.max(...times) : times.reduce((a, b) => a + b, 0)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Standings</h3>
      <p className="mt-1 text-xs text-muted">{WIN_CONDITION_LABEL[gameState.win_condition]}</p>

      <ul className="mt-3 space-y-2.5">
        {teams.map((team) => (
          <li key={team.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-ink">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: teamColorById[team.id] }} />
              {team.name}
            </span>
            <span className="font-display tabular-nums text-ink">{formatCountdown(scoreFor(team.id))}</span>
          </li>
        ))}
      </ul>

      {rounds.length > 0 && (
        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="text-left text-faint">
              <th className="pb-1.5 font-medium">Round</th>
              <th className="pb-1.5 font-medium">Hiders</th>
              <th className="pb-1.5 text-right font-medium">Hide time</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => {
              const hiders = teams.find((t) => t.id === round.hider_team_id)
              const hidingNow = round.status === 'active' && now < new Date(round.hiding_ends_at).getTime()
              return (
                <tr key={round.id} className="border-t border-border text-muted">
                  <td className="py-1.5">{round.round_number}</td>
                  <td className="py-1.5 text-ink">{hiders?.name}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {hidingNow ? (
                      'Hiding…'
                    ) : (
                      <>
                        <span className="text-ink">{formatCountdown(liveHideSeconds(round, now))}</span>
                        {round.status === 'active' && ' (live)'}
                        {round.end_reason === 'time_cap' && ' (limit)'}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {gameEnded && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/[0.06] p-3 text-sm text-ink">
          {winner ? (
            <>
              <span className="font-medium">{winner.name}</span> wins!
            </>
          ) : (
            "It's a tie."
          )}
        </div>
      )}
    </div>
  )
}
