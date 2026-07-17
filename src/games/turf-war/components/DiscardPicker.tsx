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
      <div className="rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        Waiting to see if the other team vetoes your discard...
        <button onClick={onDone} className="mt-2 block text-xs text-gray-500 hover:text-gray-300">
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <h3 className="font-semibold">You captured a zone! Discard one open zone.</h3>
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {openZones.map((z) => (
          <button
            key={z.id}
            disabled={busy}
            onClick={() => propose(z.id)}
            className="block w-full rounded-md border border-gray-800 px-3 py-1.5 text-left text-sm hover:border-gray-600 disabled:opacity-50"
          >
            {z.region.name}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button onClick={onDone} className="mt-2 text-xs text-gray-500 hover:text-gray-300">
        Skip
      </button>
    </div>
  )
}
