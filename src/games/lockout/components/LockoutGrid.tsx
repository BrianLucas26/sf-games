import type { LockoutCellRow } from '../types'

interface LockoutGridProps {
  cells: LockoutCellRow[]
  boardSize: number
  teamColorById: Record<string, string>
  selectedCellId: string | null
  onSelect: (cell: LockoutCellRow) => void
}

// Cells stay compact (a board can hit 25 cells) -- just a position number and
// a team-color fill when claimed. Tapping opens the full challenge text in
// LockoutCellDetail rather than cramming prompt text into every cell.
export function LockoutGrid({ cells, boardSize, teamColorById, selectedCellId, onSelect }: LockoutGridProps) {
  const byPosition = new Map(cells.map((c) => [c.position, c]))

  return (
    <div
      className="grid aspect-square w-full gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: boardSize * boardSize }, (_, position) => {
        const cell = byPosition.get(position)
        const teamColor = cell?.claimed_by_team_id ? teamColorById[cell.claimed_by_team_id] : undefined
        const isSelected = cell?.id === selectedCellId

        return (
          <button
            key={position}
            disabled={!cell}
            onClick={() => cell && onSelect(cell)}
            className={`flex aspect-square items-center justify-center rounded-md border text-xs font-medium transition-colors sm:text-sm ${
              isSelected ? 'border-accent ring-1 ring-accent/50' : 'border-border'
            }`}
            style={{ backgroundColor: teamColor ? `${teamColor}80` : 'rgba(154, 154, 166, 0.15)' }}
          >
            <span className={teamColor ? 'text-ink' : 'text-faint'}>{position + 1}</span>
          </button>
        )
      })}
    </div>
  )
}
