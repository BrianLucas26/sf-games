import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { RegionRow } from '@/types/geo'
import type { RegionSetKey } from '../types'

// map_region_sets slugs for the two overlays -- neighborhoods is the same set
// Turf War plays on (0009), districts are the 11 supervisor districts (0036).
const REGION_SET_SLUGS: Record<RegionSetKey, string> = {
  neighborhoods: 'sf-neighborhoods',
  districts: 'sf-supervisor-districts',
}

async function loadRegionSet(slug: string): Promise<RegionRow[]> {
  const { data } = await supabase
    .from('map_regions')
    .select('id, region_set_id, slug, name, geometry, centroid_lat, centroid_lng, created_at, map_region_sets!inner(slug)')
    .eq('map_region_sets.slug', slug)
    .order('name')
  return (data ?? []) as unknown as RegionRow[]
}

// Static reference data -- loaded once per board, no realtime needed.
export function useRegionSets() {
  const [regions, setRegions] = useState<Record<RegionSetKey, RegionRow[]>>({ neighborhoods: [], districts: [] })

  useEffect(() => {
    let cancelled = false
    Promise.all([loadRegionSet(REGION_SET_SLUGS.neighborhoods), loadRegionSet(REGION_SET_SLUGS.districts)]).then(
      ([neighborhoods, districts]) => {
        if (!cancelled) setRegions({ neighborhoods, districts })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return regions
}
