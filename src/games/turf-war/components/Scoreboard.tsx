import type { TeamRow } from '@/types/database'
import type { TurfWarStandingsRow } from '../types'

interface ScoreboardProps {
  standings: TurfWarStandingsRow[]
  teams: TeamRow[]
  teamColorById: Record<string, string>
}

export function Scoreboard({ standings, teams, teamColorById }: ScoreboardProps) {
  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-300">Standings</h3>
      <ul className="mt-2 space-y-2">
        {teams.map((team) => {
          const standing = standings.find((s) => s.team_id === team.id)
          return (
            <li key={team.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: teamColorById[team.id] }}
                />
                {team.name}
              </span>
              <span className="text-gray-400">
                {standing?.claimed_count ?? 0} claimed &middot; largest{' '}
                {standing?.largest_cluster_size ?? 0}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
