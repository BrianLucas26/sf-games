import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'
import type { SecretZoneRow } from '../hooks/useMySecretZones'

interface SecretZonePanelProps {
  secrets: SecretZoneRow[]
  zones: ZoneWithRegion[]
  onSelect: (zone: ZoneWithRegion) => void
}

export function SecretZonePanel({ secrets, zones, onSelect }: SecretZonePanelProps) {
  if (secrets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        No secret neighborhoods yet — your team gets one periodically.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
      <h3 className="text-sm font-medium text-accent">Your secret neighborhoods</h3>
      <ul className="mt-2 space-y-1">
        {secrets.map((s) => {
          const zone = zones.find((z) => z.id === s.zone_id)
          return (
            <li key={s.id}>
              <button
                disabled={!zone}
                onClick={() => zone && onSelect(zone)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                {zone?.region.name ?? 'Unknown neighborhood'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
