import { RegionMap } from '@/lib/map/RegionMap'
import type { RegionRow } from '@/types/geo'
import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'
import { teamFillColor, teamSecretFillColor, ZONE_STATUS_COLORS } from '../theme'

interface ZoneMapProps {
  zones: ZoneWithRegion[]
  teamColorById: Record<string, string>
  mySecretZoneIds: Set<string>
  myTeamColor: string | undefined
  onZoneClick: (zone: ZoneWithRegion) => void
}

// Configures the shared RegionMap for Turf War's region set: colors zones by
// status/owning team (plus a faint highlight for the caller's own team's
// unclaimed secret zones) and maps clicks back to this game's zone rows.
export function ZoneMap({ zones, teamColorById, mySecretZoneIds, myTeamColor, onZoneClick }: ZoneMapProps) {
  const regions: RegionRow[] = zones.map((z) => z.region)

  function getFillColor(region: RegionRow): string {
    const zone = zones.find((z) => z.region.id === region.id)
    if (!zone) return ZONE_STATUS_COLORS.locked

    if (zone.status === 'claimed') {
      const hex = zone.owning_team_id ? teamColorById[zone.owning_team_id] : undefined
      return hex ? teamFillColor(hex) : ZONE_STATUS_COLORS.locked
    }

    if (zone.status === 'locked' && myTeamColor && mySecretZoneIds.has(zone.id)) {
      return teamSecretFillColor(myTeamColor)
    }

    if (zone.status === 'open') return ZONE_STATUS_COLORS.open
    if (zone.status === 'discarded') return ZONE_STATUS_COLORS.discarded
    return ZONE_STATUS_COLORS.locked
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
      className="h-[65vh] w-full"
    />
  )
}
