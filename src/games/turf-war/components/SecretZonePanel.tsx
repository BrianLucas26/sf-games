import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'
import type { SecretZoneRow } from '../hooks/useMySecretZones'

interface SecretZonePanelProps {
  secrets: SecretZoneRow[]
  zones: ZoneWithRegion[]
}

export function SecretZonePanel({ secrets, zones }: SecretZonePanelProps) {
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
      <ul className="mt-2 space-y-1 text-sm text-ink">
        {secrets.map((s) => {
          const zone = zones.find((z) => z.id === s.zone_id)
          return <li key={s.id}>{zone?.region.name ?? 'Unknown neighborhood'}</li>
        })}
      </ul>
    </div>
  )
}
