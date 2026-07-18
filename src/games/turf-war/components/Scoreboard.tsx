import type { TeamRow } from '@/types/database'
import type { TurfWarStandingsRow } from '../types'

interface ScoreboardProps {
  standings: TurfWarStandingsRow[]
  teams: TeamRow[]
  teamColorById: Record<string, string>
}

export function Scoreboard({ standings, teams, teamColorById }: ScoreboardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Standings</h3>
      <ul className="mt-3 space-y-2.5">
        {teams.map((team) => {
          const standing = standings.find((s) => s.team_id === team.id)
          return (
            <li key={team.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-ink">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: teamColorById[team.id] }}
                />
                {team.name}
              </span>
              <span className="text-muted">
                {standing?.claimed_count ?? 0} claimed · largest {standing?.largest_cluster_size ?? 0}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
