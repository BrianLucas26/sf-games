import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { proposeDiscard } from '../api'
import type { ZoneWithRegion } from '../hooks/useTurfWarRealtime'
import type { TurfWarCaptureRow, TurfWarDiscardProposalRow } from '../types'

interface DiscardPickerProps {
  gameId: string
  capture: TurfWarCaptureRow
  openZones: ZoneWithRegion[]
  onDone: () => void
}

// Tracks every discard_proposals row for this capture (not just the pending
// one) so it can tell the difference between "nothing proposed yet",
// "waiting on the veto window", "vetoed -- pick again", and "applied".
// Without this the picker had no way to learn a veto happened at all: it
// just sat on "waiting" forever, since the capturing team's own client was
// never told the proposal it made had been resolved.
export function DiscardPicker({ gameId, capture, openZones, onDone }: DiscardPickerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<TurfWarDiscardProposalRow[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('turf_war_discard_proposals')
        .select('*')
        .eq('capture_id', capture.id)
        .order('proposed_at')
      if (!cancelled && data) setProposals(data)
    }

    load()
    const channel = supabase
      .channel(`discard-proposals-${capture.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turf_war_discard_proposals',
          filter: `capture_id=eq.${capture.id}`,
        },
        load,
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [capture.id])

  const vetoedZoneIds = new Set(
    proposals.filter((p) => p.status === 'vetoed').map((p) => p.target_zone_id),
  )
  const pending = proposals.find((p) => p.status === 'pending')
  const applied = proposals.find((p) => p.status === 'applied')

  async function propose(zoneId: string) {
    setBusy(true)
    setError(null)
    try {
      await proposeDiscard({ gameId, captureId: capture.id, targetZoneId: zoneId })
      // Don't rely solely on realtime for our own action -- see the
      // Lobby.tsx precedent (a subscription can miss an update that lands
      // before the channel finishes establishing).
      const { data } = await supabase
        .from('turf_war_discard_proposals')
        .select('*')
        .eq('capture_id', capture.id)
        .order('proposed_at')
      if (data) setProposals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose discard.')
    } finally {
      setBusy(false)
    }
  }

  if (applied) {
    const zoneName = openZones.find((z) => z.id === applied.target_zone_id)?.region.name ?? 'the zone'
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Discarded {zoneName}.
        <button onClick={onDone} className="mt-2 block text-xs text-faint transition-colors hover:text-muted">
          Dismiss
        </button>
      </div>
    )
  }

  if (pending) {
    const zoneName = openZones.find((z) => z.id === pending.target_zone_id)?.region.name ?? 'the zone'
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Waiting to see if the other team vetoes your discard of {zoneName}…
      </div>
    )
  }

  const choices = openZones.filter((z) => !vetoedZoneIds.has(z.id))
  const wasVetoed = vetoedZoneIds.size > 0

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
      <h3 className="font-display font-medium text-ink">
        {wasVetoed ? 'Vetoed — pick a different zone to discard' : 'You captured a zone — discard one open zone'}
      </h3>
      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {choices.map((z) => (
          <button
            key={z.id}
            disabled={busy}
            onClick={() => propose(z.id)}
            className="block w-full rounded-md border border-border-strong bg-surface px-3 py-1.5 text-left text-sm text-ink transition-colors hover:border-accent/50 disabled:opacity-50"
          >
            {z.region.name}
          </button>
        ))}
        {choices.length === 0 && <p className="text-sm text-muted">No other open zones to discard.</p>}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <button onClick={onDone} className="mt-2 text-xs text-faint transition-colors hover:text-muted">
        Skip
      </button>
    </div>
  )
}
