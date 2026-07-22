import type { LockoutCellRow } from '../types'

interface LockoutGridProps {
  cells: LockoutCellRow[]
  boardSize: number
  teamColorById: Record<string, string>
  selectedCellId: string | null
  onSelect: (cell: LockoutCellRow) => void
}

// Cells show the challenge's short prompt text directly (clamped to fit --
// a board can hit 25 cells) plus a team-color fill when claimed. Tapping
// opens the full detail -- prompt plus an optional longer description --
// in LockoutCellDetail.
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
            className={`flex aspect-square items-center justify-center rounded-md border p-1 text-center transition-colors sm:p-1.5 ${
              isSelected ? 'border-accent ring-1 ring-accent/50' : 'border-border'
            }`}
            style={{ backgroundColor: teamColor ? `${teamColor}80` : 'rgba(154, 154, 166, 0.15)' }}
          >
            <span
              className={`line-clamp-4 text-[9px] leading-tight font-medium sm:text-[11px] ${
                teamColor ? 'text-ink' : 'text-faint'
              }`}
            >
              {cell?.prompt}
            </span>
          </button>
        )
      })}
    </div>
  )
}
