// Shared spatial-regions layer (src/lib/map/RegionMap.tsx + any game that
// partitions the city into zones). Mirrors supabase/migrations/0002_map_regions.sql.

export interface RegionSetRow {
  id: string
  slug: string
  name: string
  source: string | null
  created_at: string
}

export interface RegionRow {
  id: string
  region_set_id: string
  slug: string
  name: string
  geometry: GeoJSON.Geometry
  centroid_lat: number
  centroid_lng: number
  created_at: string
}

export interface RegionAdjacencyRow {
  region_id: string
  neighbor_id: string
}
