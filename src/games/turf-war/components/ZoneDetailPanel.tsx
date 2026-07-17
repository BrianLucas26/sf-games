import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PlayerRow } from '@/types/database'
import { claimZone } from '../api'
import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'
import type { TurfWarCaptureRow, TurfWarVerificationMode } from '../types'

interface ZoneDetailPanelProps {
  zone: ZoneWithRegion
  challenge?: string
  player: PlayerRow
  verificationMode: TurfWarVerificationMode
  onClose: () => void
  onClaimed: (capture: TurfWarCaptureRow) => void
}

export function ZoneDetailPanel({
  zone,
  challenge,
  player,
  verificationMode,
  onClose,
  onClaimed,
}: ZoneDetailPanelProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const claimable = zone.status === 'open' && Boolean(player.team_id)

  async function handleClaim() {
    setBusy(true)
    setError(null)
    try {
      let lat: number | undefined
      let lng: number | undefined
      let photoUrl: string | undefined

      if (verificationMode !== 'none') {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true }),
        )
        lat = position.coords.latitude
        lng = position.coords.longitude
      }

      if (verificationMode === 'gps_photo') {
        if (!photoFile) throw new Error('A photo is required for this game.')
        const path = `${zone.game_id}/${zone.id}-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('turf-war-claim-photos')
          .upload(path, photoFile)
        if (uploadError) throw uploadError
        photoUrl = supabase.storage.from('turf-war-claim-photos').getPublicUrl(path).data.publicUrl
      }

      const result = await claimZone({ gameId: zone.game_id, zoneId: zone.id, lat, lng, photoUrl })
      onClaimed(result.capture)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim this zone.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{zone.region.name}</h3>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">
          Close
        </button>
      </div>
      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{zone.status}</p>
      {challenge && <p className="mt-3 text-sm text-gray-300">{challenge}</p>}

      {zone.status === 'open' && !player.team_id && (
        <p className="mt-3 text-xs text-amber-400">Join a team before claiming a zone.</p>
      )}

      {claimable && (
        <div className="mt-4 space-y-2">
          {verificationMode === 'gps_photo' && (
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-gray-400"
            />
          )}
          <button
            onClick={handleClaim}
            disabled={busy}
            className="w-full rounded-md bg-orange-600 py-2 text-sm font-medium hover:bg-orange-500 disabled:opacity-50"
          >
            {busy ? 'Claiming...' : 'Claim this neighborhood'}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
