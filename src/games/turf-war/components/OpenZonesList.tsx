import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'

interface OpenZonesListProps {
  zones: ZoneWithRegion[]
  onSelect: (zone: ZoneWithRegion) => void
}

// Always-visible companion to the map's "lighter gray" open color -- the
// same set of zones, in list form, so what's currently claimable is never
// hidden behind having to spot it on the map first. Updates live as zones
// get claimed, discarded, and replenished, since it's a pure derivation of
// the same realtime zones data the map already renders.
export function OpenZonesList({ zones, onSelect }: OpenZonesListProps) {
  const openZones = zones.filter((z) => z.status === 'open')

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-ink">Open neighborhoods</h3>
      {openZones.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None open right now.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {openZones.map((zone) => (
            <li key={zone.id}>
              <button
                onClick={() => onSelect(zone)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink/90 transition-colors hover:bg-surface-hover"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[rgba(154,154,166,0.9)]" />
                {zone.region.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
