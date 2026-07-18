import { useEffect, useMemo, useRef, useState } from 'react'
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
  const regionsRef = useRef(regions)
  regionsRef.current = regions
  const [mapLoaded, setMapLoaded] = useState(false)

  // The actual SET of regions only changes once (at game start) -- zone
  // status updates just replace the `regions` array reference every render
  // without changing which regions exist. Keying the map-creation effect off
  // this stable id list (instead of the array reference) is what stops the
  // whole Mapbox instance -- source, layers, click handlers -- from being
  // torn down and rebuilt on every realtime event, which was the cause of
  // both the visible flicker and colors appearing to "not update" (they did
  // update, then immediately got reset by the next recreation).
  const regionIdsKey = useMemo(
    () =>
      regions
        .map((r) => r.id)
        .sort()
        .join(','),
    [regions],
  )

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
        data: toFeatureCollection(regionsRef.current),
      })

      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': ['coalesce', ['feature-state', 'color'], '#33333d'],
          'fill-opacity': ['coalesce', ['feature-state', 'opacity'], 0.35],
        },
      })

      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: { 'line-color': '#1c1c22', 'line-width': 1 },
      })

      for (const region of regionsRef.current) {
        const [color, opacity] = parseColor(getFillColor(region))
        map.setFeatureState({ source: SOURCE_ID, id: region.id }, { color, opacity })
      }

      map.on('click', FILL_LAYER_ID, (e) => {
        const feature = e.features?.[0]
        const regionId = feature?.properties?.regionId as string | undefined
        const region = regionsRef.current.find((r) => r.id === regionId)
        if (region) onRegionClickRef.current?.(region)
      })

      map.on('mouseenter', FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })

      setMapLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionIdsKey])

  // Recolor without touching Mapbox's load count -- feature-state updates
  // are free repaints, not new map loads, so this can run on every realtime event.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    for (const region of regions) {
      if (map.getSource(SOURCE_ID)) {
        const [color, opacity] = parseColor(getFillColor(region))
        map.setFeatureState({ source: SOURCE_ID, id: region.id }, { color, opacity })
      }
    }
  }, [regions, getFillColor, mapLoaded])

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Map unavailable: set VITE_MAPBOX_TOKEN in .env.local to render the board.
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? 'h-full w-full'}`}>
      <div ref={containerRef} className="h-full w-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}
    </div>
  )
}

// fill-color/opacity are stored as separate feature-state values so opacity
// can vary per status (e.g. secret zones are the same team color as claimed
// ones, just much fainter) without needing a distinct color per alpha level.
// getFillColor returns a normal CSS color; rgba() alpha (if present) becomes
// the opacity feature-state, otherwise a caller-appropriate default applies.
function parseColor(cssColor: string): [string, number] {
  const rgbaMatch = cssColor.match(/rgba?\(([^)]+)\)/)
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((p) => p.trim())
    const [r, g, b] = parts
    const a = parts[3] !== undefined ? Number(parts[3]) : 1
    return [`rgb(${r} ${g} ${b})`, a]
  }
  return [cssColor, 0.55]
}
