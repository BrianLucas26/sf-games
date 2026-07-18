import { useState } from 'react'
import { proposeDiscard } from '../api'
import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'
import type { TurfWarCaptureRow } from '../types'

interface DiscardPickerProps {
  gameId: string
  capture: TurfWarCaptureRow
  openZones: ZoneWithRegion[]
  onDone: () => void
}

export function DiscardPicker({ gameId, capture, openZones, onDone }: DiscardPickerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposedZoneId, setProposedZoneId] = useState<string | null>(null)

  async function propose(zoneId: string) {
    setBusy(true)
    setError(null)
    try {
      await proposeDiscard({ gameId, captureId: capture.id, targetZoneId: zoneId })
      setProposedZoneId(zoneId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose discard.')
    } finally {
      setBusy(false)
    }
  }

  if (proposedZoneId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Waiting to see if the other team vetoes your discard…
        <button onClick={onDone} className="mt-2 block text-xs text-faint transition-colors hover:text-muted">
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
      <h3 className="font-display font-medium text-ink">You captured a zone — discard one open zone</h3>
      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {openZones.map((z) => (
          <button
            key={z.id}
            disabled={busy}
            onClick={() => propose(z.id)}
            className="block w-full rounded-md border border-border-strong bg-surface px-3 py-1.5 text-left text-sm text-ink transition-colors hover:border-accent/50 disabled:opacity-50"
          >
            {z.region.name}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <button onClick={onDone} className="mt-2 text-xs text-faint transition-colors hover:text-muted">
        Skip
      </button>
    </div>
  )
}
