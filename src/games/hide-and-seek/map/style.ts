import type { RegionSetKey } from '../types'

// Overlay outline/label colors -- distinct from the red/blue team colors so
// an overlay never reads as "that team's territory". Shared by the map layers
// and the overlay toggles' color dots.
export const REGION_SET_COLORS: Record<RegionSetKey, string> = {
  neighborhoods: '#d97757',
  districts: '#9d7cf0',
}
