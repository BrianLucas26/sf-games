// Turf War's zone-status/map colors. TEAM_COLORS itself lives in
// src/lib/teamColors.ts since it's shared with every game, not turf-war-specific.
export { TEAM_COLORS } from '@/lib/teamColors'

export const ZONE_STATUS_COLORS = {
  locked: 'rgba(51, 51, 61, 0.35)',
  open: 'rgba(154, 154, 166, 0.6)',
  discarded: 'rgba(20, 20, 24, 0.4)',
} as const

// Claimed: a real but translucent team color -- streets stay visible
// underneath. Secret (own team only): the same team color, much fainter, so
// it reads as "quietly yours" rather than competing with claimed zones.
export function teamFillColor(hex: string): string {
  return withAlpha(hex, 0.5)
}

export function teamSecretFillColor(hex: string): string {
  return withAlpha(hex, 0.16)
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
