import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { RegionRow } from '@/types/geo'
import type { HideAndSeekMapMarkRow, LngLat, MarkData, RegionSetKey } from '../types'
import { markToFeatures } from './geometry'
import { REGION_SET_COLORS } from './style'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken
}

const REGION_SETS: RegionSetKey[] = ['neighborhoods', 'districts']
const MARK_COLOR = '#f5c542'
const DRAFT_COLOR = '#d97757'
const LABEL_FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular']
// Pins and ask-point labels are few and matter more than any street or
// region name, so they never lose Mapbox's label collision.
const ALWAYS_SHOW = { 'text-allow-overlap': true, 'text-ignore-placement': true } as const
// A drag has to move this many screen pixels before the pen adds a point --
// keeps freehand strokes from ballooning into thousands of near-duplicates.
const PEN_MIN_STEP_PX = 4

export interface AskPoint {
  id: string
  at: LngLat
  label: string
}

export interface HideAndSeekMapProps {
  neighborhoods: RegionRow[]
  districts: RegionRow[]
  showNeighborhoods: boolean
  showDistricts: boolean
  marks: HideAndSeekMapMarkRow[]
  draft?: MarkData | null
  askPoints?: AskPoint[]
  // While true, one-finger / mouse drags draw a stroke instead of panning.
  penActive?: boolean
  onMapClick?: (at: LngLat, hit: Partial<Record<RegionSetKey, RegionRow>>) => void
  onStroke?: (points: LngLat[]) => void
  className?: string
}

function regionFeatures(regions: RegionRow[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regions.map((region) => ({
      type: 'Feature',
      geometry: region.geometry,
      properties: { regionId: region.id, name: region.name },
    })),
  }
}

function regionLabels(regions: RegionRow[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regions.map((region) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [region.centroid_lng, region.centroid_lat] },
      properties: { name: region.name },
    })),
  }
}

function collection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features }
}

function setData(map: mapboxgl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined
  source?.setData(data)
}

const EMPTY = collection([])

// Hide and Seek's map: toggleable neighborhood/district overlays, the
// seekers' shared markup (shaded half-planes and circles, freehand strokes,
// pins, crossed-out regions), and where each question was asked from.
// Separate from the shared RegionMap (src/lib/map/RegionMap.tsx) because
// this one is a drawing surface over several independent layers rather than
// a single "color each region" choropleth -- it borrows the same conventions
// (token setup, dark style, promoteId for feature-state).
export function HideAndSeekMap({
  neighborhoods,
  districts,
  showNeighborhoods,
  showDistricts,
  marks,
  draft = null,
  askPoints = [],
  penActive = false,
  onMapClick,
  onStroke,
  className,
}: HideAndSeekMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Mapbox handlers are bound once at load; refs let them always see the
  // latest props without tearing the map down (same approach as RegionMap).
  const regionsRef = useRef({ neighborhoods, districts })
  regionsRef.current = { neighborhoods, districts }
  const visibleRef = useRef({ neighborhoods: showNeighborhoods, districts: showDistricts })
  visibleRef.current = { neighborhoods: showNeighborhoods, districts: showDistricts }
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const onStrokeRef = useRef(onStroke)
  onStrokeRef.current = onStroke
  const penActiveRef = useRef(penActive)
  penActiveRef.current = penActive

  useEffect(() => {
    if (!containerRef.current || !mapboxToken) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-122.4394, 37.7599], // San Francisco
      zoom: 11.3,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right',
    )

    map.on('load', () => {
      for (const set of REGION_SETS) {
        const color = REGION_SET_COLORS[set]
        // promoteId: region ids are UUID strings, which feature-state can't
        // key on reliably without it -- see RegionMap for the full story.
        map.addSource(set, { type: 'geojson', data: EMPTY, promoteId: 'regionId' })
        map.addSource(`${set}-labels`, { type: 'geojson', data: EMPTY })
        map.addLayer({
          id: `${set}-fill`,
          type: 'fill',
          source: set,
          layout: { visibility: 'none' },
          paint: {
            'fill-color': ['case', ['boolean', ['feature-state', 'excluded'], false], '#000000', color],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'excluded'], false], 0.6, 0.04],
          },
        })
      }

      map.addSource('marks', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'marks-shade',
        type: 'fill',
        source: 'marks',
        filter: ['==', ['get', 'role'], 'shade'],
        paint: { 'fill-color': '#000000', 'fill-opacity': 0.55 },
      })

      for (const set of REGION_SETS) {
        map.addLayer({
          id: `${set}-outline`,
          type: 'line',
          source: set,
          layout: { visibility: 'none' },
          paint: { 'line-color': REGION_SET_COLORS[set], 'line-width': set === 'districts' ? 2 : 1, 'line-opacity': 0.85 },
        })
      }

      map.addLayer({
        id: 'marks-line',
        type: 'line',
        source: 'marks',
        filter: ['==', ['get', 'role'], 'line'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': MARK_COLOR, 'line-width': 2.5 },
      })

      map.addSource('draft', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'draft-shade',
        type: 'fill',
        source: 'draft',
        filter: ['==', ['get', 'role'], 'shade'],
        paint: { 'fill-color': DRAFT_COLOR, 'fill-opacity': 0.25 },
      })
      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        filter: ['==', ['get', 'role'], 'line'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': DRAFT_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
      })
      map.addLayer({
        id: 'draft-pin',
        type: 'circle',
        source: 'draft',
        filter: ['==', ['get', 'role'], 'pin'],
        paint: { 'circle-radius': 7, 'circle-color': DRAFT_COLOR, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
      })

      map.addSource('ask-points', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'ask-points',
        type: 'circle',
        source: 'ask-points',
        paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': DRAFT_COLOR, 'circle-stroke-width': 2 },
      })
      map.addLayer({
        id: 'ask-points-label',
        type: 'symbol',
        source: 'ask-points',
        layout: { ...ALWAYS_SHOW, 'text-field': ['get', 'label'], 'text-font': LABEL_FONT, 'text-size': 11, 'text-offset': [0, 1.2] },
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.5 },
      })

      map.addLayer({
        id: 'marks-pin',
        type: 'circle',
        source: 'marks',
        filter: ['==', ['get', 'role'], 'pin'],
        paint: { 'circle-radius': 7, 'circle-color': MARK_COLOR, 'circle-stroke-color': '#000000', 'circle-stroke-width': 2 },
      })
      map.addLayer({
        id: 'marks-pin-label',
        type: 'symbol',
        source: 'marks',
        filter: ['==', ['get', 'role'], 'pin'],
        layout: {
          ...ALWAYS_SHOW,
          'text-field': ['coalesce', ['get', 'label'], ''],
          'text-font': LABEL_FONT,
          'text-size': 12,
          'text-offset': [0, 1.3],
        },
        paint: { 'text-color': MARK_COLOR, 'text-halo-color': '#000000', 'text-halo-width': 1.5 },
      })

      for (const set of REGION_SETS) {
        map.addLayer({
          id: `${set}-label`,
          type: 'symbol',
          source: `${set}-labels`,
          layout: {
            visibility: 'none',
            'text-field': ['get', 'name'],
            'text-font': LABEL_FONT,
            'text-size': set === 'districts' ? 13 : 10,
          },
          paint: { 'text-color': REGION_SET_COLORS[set], 'text-halo-color': '#000000', 'text-halo-width': 1.2 },
        })
      }

      map.on('click', (e) => {
        if (penActiveRef.current) return
        const hit: Partial<Record<RegionSetKey, RegionRow>> = {}
        for (const set of REGION_SETS) {
          if (!visibleRef.current[set]) continue
          const feature = map.queryRenderedFeatures(e.point, { layers: [`${set}-fill`] })[0]
          const regionId = feature?.properties?.regionId as string | undefined
          const region = regionsRef.current[set].find((r) => r.id === regionId)
          if (region) hit[set] = region
        }
        onMapClickRef.current?.([e.lngLat.lng, e.lngLat.lat], hit)
      })

      // --- Freehand pen ---
      let stroke: LngLat[] | null = null
      let lastPoint: mapboxgl.Point | null = null

      const begin = (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
        if (!penActiveRef.current) return
        if ('touches' in e.originalEvent && e.originalEvent.touches.length !== 1) return
        e.preventDefault()
        stroke = [[e.lngLat.lng, e.lngLat.lat]]
        lastPoint = e.point
      }
      const move = (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
        if (!stroke || !lastPoint) return
        if (Math.hypot(e.point.x - lastPoint.x, e.point.y - lastPoint.y) < PEN_MIN_STEP_PX) return
        stroke.push([e.lngLat.lng, e.lngLat.lat])
        lastPoint = e.point
        setData(map, 'draft', collection(markToFeatures('stroke', { kind: 'freehand', data: { points: stroke } })))
      }
      const end = () => {
        if (!stroke) return
        const points = stroke
        stroke = null
        lastPoint = null
        setData(map, 'draft', EMPTY)
        if (points.length >= 2) onStrokeRef.current?.(points)
      }
      map.on('mousedown', begin)
      map.on('touchstart', begin)
      map.on('mousemove', move)
      map.on('touchmove', move)
      map.on('mouseup', end)
      map.on('touchend', end)
      map.on('touchcancel', end)

      setMapLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, [])

  // Region data arrives after the map is created (separate fetch).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    setData(map, 'neighborhoods', regionFeatures(neighborhoods))
    setData(map, 'neighborhoods-labels', regionLabels(neighborhoods))
    setData(map, 'districts', regionFeatures(districts))
    setData(map, 'districts-labels', regionLabels(districts))
  }, [neighborhoods, districts, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const visible = { neighborhoods: showNeighborhoods, districts: showDistricts }
    for (const set of REGION_SETS) {
      for (const layer of ['fill', 'outline', 'label']) {
        map.setLayoutProperty(`${set}-${layer}`, 'visibility', visible[set] ? 'visible' : 'none')
      }
    }
  }, [showNeighborhoods, showDistricts, mapLoaded])

  const excludedRegionIds = useMemo(
    () => new Set(marks.flatMap((m) => (m.kind === 'region' ? [m.data.region_id] : []))),
    [marks],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    setData(map, 'marks', collection(marks.flatMap((m) => markToFeatures(m.id, m))))
    for (const set of REGION_SETS) {
      for (const region of set === 'neighborhoods' ? neighborhoods : districts) {
        map.setFeatureState({ source: set, id: region.id }, { excluded: excludedRegionIds.has(region.id) })
      }
    }
  }, [marks, excludedRegionIds, neighborhoods, districts, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    setData(map, 'draft', draft ? collection(markToFeatures('draft', draft)) : EMPTY)
  }, [draft, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    setData(
      map,
      'ask-points',
      collection(
        askPoints.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.at },
          properties: { label: p.label },
        })),
      ),
    )
  }, [askPoints, mapLoaded])

  // Pen mode: stop one-finger drags from panning the map (or scrolling the
  // page on mobile) so they can draw instead. Two-finger pinch still zooms.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    if (penActive) map.dragPan.disable()
    else map.dragPan.enable()
    map.getCanvasContainer().style.touchAction = penActive ? 'none' : ''
    map.getCanvas().style.cursor = penActive ? 'crosshair' : ''
  }, [penActive, mapLoaded])

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Map unavailable: set VITE_MAPBOX_TOKEN in .env.local to render the map.
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
