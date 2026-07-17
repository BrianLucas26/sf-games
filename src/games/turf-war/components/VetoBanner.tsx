import { useEffect, useState } from 'react'
import type { PlayerRow } from '@/types/database'
import { resolveDiscard, vetoDiscard } from '../api'
import type { ProposalWithCapture, ZoneWithRegion } from '../hooks/useTurfWarRealtime'

interface VetoBannerProps {
  proposal: ProposalWithCapture
  player: PlayerRow | null
  zones: ZoneWithRegion[]
}

function secondsUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000))
}

export function VetoBanner({ proposal, player, zones }: VetoBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(proposal.expires_at))
  const [error, setError] = useState<string | null>(null)
  const targetZone = zones.find((z) => z.id === proposal.target_zone_id)
  const isOpposingTeam = Boolean(
    player?.team_id && proposal.capture?.team_id && player.team_id !== proposal.capture.team_id,
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = secondsUntil(proposal.expires_at)
      setSecondsLeft(remaining)
      if (remaining === 0) {
        // Fast path: whoever's client notices first applies it, rather than
        // waiting for the next pg_cron sweep.
        resolveDiscard(proposal.id).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [proposal.expires_at, proposal.id])

  async function handleVeto() {
    setError(null)
    try {
      await vetoDiscard(proposal.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to veto.')
    }
  }

  return (
    <div className="rounded-lg border border-yellow-800/50 bg-yellow-950/30 p-4 text-sm">
      <p>
        {targetZone?.region.name ?? 'A zone'} will be discarded in {secondsLeft}s.
      </p>
      {isOpposingTeam && (
        <button
          onClick={handleVeto}
          className="mt-2 rounded-md bg-yellow-700 px-3 py-1 text-xs font-medium hover:bg-yellow-600"
        >
          Veto
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
