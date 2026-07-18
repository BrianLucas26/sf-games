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
    <div className="rounded-xl border border-danger/40 bg-danger/[0.08] p-4 text-sm">
      <p className="text-ink/90">
        <span className="font-medium">{targetZone?.region.name ?? 'A zone'}</span> will be discarded in{' '}
        <span className="font-display tabular-nums text-danger">{secondsLeft}s</span>
      </p>
      {isOpposingTeam && (
        <button
          onClick={handleVeto}
          className="mt-3 rounded-md border border-danger/50 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Veto
        </button>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}
