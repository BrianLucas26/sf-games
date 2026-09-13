import type { HideAndSeekRoundRow } from './types'

// A round's hide time, live: counts up from the end of the hiding period and
// stops at whichever comes first -- the seekers' find claim, the seek cap, or
// the round's recorded result once it's over. Mirrors how
// hide_and_seek_finish_round() computes hide_seconds server-side, so the
// running clock lands on the same number the standings end up recording.
export function liveHideSeconds(round: HideAndSeekRoundRow, now: number): number {
  if (round.status === 'completed') return round.hide_seconds ?? 0
  const start = new Date(round.hiding_ends_at).getTime()
  let end = now
  if (round.found_claimed_at) end = Math.min(end, new Date(round.found_claimed_at).getTime())
  if (round.seek_ends_at) end = Math.min(end, new Date(round.seek_ends_at).getTime())
  return Math.max(0, Math.floor((end - start) / 1000))
}
