import { useState } from 'react'
import { Button } from '@/components/Button'
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
  isMySecretZone: boolean
  onClose: () => void
  onClaimed: (capture: TurfWarCaptureRow) => void
}

const STATUS_LABEL: Record<string, string> = {
  locked: 'Not yet in play',
  open: 'Open to claim',
  claimed: 'Claimed',
  discarded: 'Discarded',
}

export function ZoneDetailPanel({
  zone,
  challenge,
  player,
  verificationMode,
  isMySecretZone,
  onClose,
  onClaimed,
}: ZoneDetailPanelProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // A secret zone stays 'locked' publicly by design (that's the whole
  // mechanism keeping it hidden from the other team) -- claim-zone's backend
  // already accepts it via the caller's turf_war_secret_zones row, this is
  // just the UI catching up to that.
  const claimable =
    (zone.status === 'open' || (zone.status === 'locked' && isMySecretZone)) && Boolean(player.team_id)

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
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-display font-medium text-ink">{zone.region.name}</h3>
        <button onClick={onClose} className="text-xs text-faint transition-colors hover:text-muted">
          Close
        </button>
      </div>
      <p className="mt-1 text-xs tracking-wide text-muted">
        {isMySecretZone && zone.status === 'locked' ? 'Your secret target' : (STATUS_LABEL[zone.status] ?? zone.status)}
      </p>
      {challenge && <p className="mt-3 text-sm leading-relaxed text-ink/80">{challenge}</p>}

      {(zone.status === 'open' || isMySecretZone) && !player.team_id && (
        <p className="mt-3 text-xs text-accent">Join a team before claiming a zone.</p>
      )}

      {claimable && (
        <div className="mt-4 space-y-3">
          {verificationMode === 'gps_photo' && (
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-xs file:text-ink"
            />
          )}
          <Button onClick={handleClaim} disabled={busy} className="w-full">
            {busy ? 'Claiming…' : 'Claim this neighborhood'}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
