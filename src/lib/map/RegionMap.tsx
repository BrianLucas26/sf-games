import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { RegionRow } from '@/types/geo'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken
}

const SOURCE_ID = 'regions'
const FILL_LAYER_ID = 'regions-fill'
const LINE_LAYER_ID = 'regions-outline'

// Generic "color some regions on a map, click one" surface. Reused by any
// game that partitions the city into zones (Turf War's neighborhoods today,
// Territory Control's districts later) by passing a different set of
// `regions` -- this component knows nothing about neighborhoods specifically.
// Games with no spatial component (Lockout) never import this.
export interface RegionMapProps {
  regions: RegionRow[]
  getFillColor: (region: RegionRow) => string
  onRegionClick?: (region: RegionRow) => void
  initialCenter?: [number, number]
  initialZoom?: number
  className?: string
}

function toFeatureCollection(regions: RegionRow[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regions.map((region) => ({
      type: 'Feature',
      id: region.id,
      geometry: region.geometry,
      properties: { regionId: region.id },
    })),
  }
}

export function RegionMap({
  regions,
  getFillColor,
  onRegionClick,
  initialCenter = [-122.4194, 37.7749], // San Francisco
  initialZoom = 11.5,
  className,
}: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const onRegionClickRef = useRef(onRegionClick)
  onRegionClickRef.current = onRegionClick

  useEffect(() => {
    if (!containerRef.current || !mapboxToken) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
    })
    mapRef.current = map

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toFeatureCollection(regions),
      })

      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': ['coalesce', ['feature-state', 'color'], '#4b5563'],
          'fill-opacity': 0.6,
        },
      })

      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: { 'line-color': '#1f2937', 'line-width': 1 },
      })

      for (const region of regions) {
        map.setFeatureState({ source: SOURCE_ID, id: region.id }, { color: getFillColor(region) })
      }

      map.on('click', FILL_LAYER_ID, (e) => {
        const feature = e.features?.[0]
        const regionId = feature?.properties?.regionId as string | undefined
        const region = regions.find((r) => r.id === regionId)
        if (region) onRegionClickRef.current?.(region)
      })

      map.on('mouseenter', FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Source/layers are set up once; region set changes are rare enough
    // (game start) that recreating the map is acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions])

  // Recolor without touching Mapbox's load count -- feature-state updates
  // are free repaints, not new map loads, so this can run on every realtime event.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const region of regions) {
      if (map.getSource(SOURCE_ID)) {
        map.setFeatureState({ source: SOURCE_ID, id: region.id }, { color: getFillColor(region) })
      }
    }
  }, [regions, getFillColor])

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">
        Map unavailable: set VITE_MAPBOX_TOKEN in .env.local to render the board.
      </div>
    )
  }

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />
}
