import { RegionMap } from '@/lib/map/RegionMap'
import type { RegionRow } from '@/types/geo'
import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'

const STATUS_COLORS: Record<string, string> = {
  locked: '#374151',
  open: '#eab308',
  discarded: '#111827',
}

interface ZoneMapProps {
  zones: ZoneWithRegion[]
  teamColorById: Record<string, string>
  onZoneClick: (zone: ZoneWithRegion) => void
}

// Configures the shared RegionMap for Turf War's region set: colors zones by
// status/owning team and maps clicks back to this game's zone rows.
export function ZoneMap({ zones, teamColorById, onZoneClick }: ZoneMapProps) {
  const regions: RegionRow[] = zones.map((z) => z.region)

  function getFillColor(region: RegionRow): string {
    const zone = zones.find((z) => z.region.id === region.id)
    if (!zone) return STATUS_COLORS.locked
    if (zone.status === 'claimed' && zone.owning_team_id) {
      return teamColorById[zone.owning_team_id] ?? '#9ca3af'
    }
    return STATUS_COLORS[zone.status] ?? STATUS_COLORS.locked
  }

  function handleRegionClick(region: RegionRow) {
    const zone = zones.find((z) => z.region.id === region.id)
    if (zone) onZoneClick(zone)
  }

  return (
    <RegionMap
      regions={regions}
      getFillColor={getFillColor}
      onRegionClick={handleRegionClick}
      className="h-[70vh] w-full rounded-lg"
    />
  )
}
