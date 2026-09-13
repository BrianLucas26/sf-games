import type { LngLat, MarkData } from '../types'

// Turns stored markup (hide_and_seek_map_marks.data) into GeoJSON the map can
// draw. Shaded areas are real polygons so Mapbox fills them; "everything
// outside this circle" is a huge rectangle with the circle cut out as a hole.

// Far enough past San Francisco in every direction that shaded half-planes
// and outside-of-circle masks never show an edge at any zoom a player uses.
const BOUNDS: [LngLat, LngLat] = [
  [-124.5, 36.8],
  [-120.5, 39.0],
]
// In Web Mercator units -- about 3.6 degrees of longitude.
const HALF_PLANE_REACH = 0.01
const EARTH_RADIUS_KM = 6371
const CIRCLE_STEPS = 72

// 'point' is only used for the draft's tapped points (see HideAndSeekMap).
export type MarkFeatureRole = 'shade' | 'line' | 'point'

export interface MarkFeatureProps {
  markId: string
  role: MarkFeatureRole
}

// Closed rectangle ring, counter-clockwise (GeoJSON outer-ring winding).
function boundsRing(): LngLat[] {
  const [[minX, minY], [maxX, maxY]] = BOUNDS
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ]
}

// Closed ring, clockwise (bearing increases clockwise) -- used as-is for a
// hole, reversed for a standalone circle.
export function circleRing(center: LngLat, radiusKm: number): LngLat[] {
  const [lng, lat] = center
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  const angular = radiusKm / EARTH_RADIUS_KM
  const ring: LngLat[] = []
  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const bearing = (i / CIRCLE_STEPS) * 2 * Math.PI
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    )
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      )
    ring.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  return ring
}

// Web Mercator (1 = the world's width), y pointing north. Mapbox draws line
// and polygon edges straight in this space, not in raw lng/lat -- so a
// shading edge computed in lng/lat and stretched across the map bows away
// from the points the seeker actually tapped.
function toMercator([lng, lat]: LngLat): [number, number] {
  const phi = (lat * Math.PI) / 180
  return [lng / 360, Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI)]
}

function fromMercator(x: number, y: number): LngLat {
  return [x * 360, ((2 * Math.atan(Math.exp(y * 2 * Math.PI)) - Math.PI / 2) * 180) / Math.PI]
}

// The shaded side of the line through a -> b. "left" is left of the direction
// of travel from a to b. Computed in Web Mercator so the drawn edge passes
// exactly through a and b at any zoom.
function halfPlane(a: LngLat, b: LngLat, side: 'left' | 'right'): { polygon: LngLat[]; line: LngLat[] } {
  const [ax, ay] = toMercator(a)
  const [bx, by] = toMercator(b)
  let dx = bx - ax
  let dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  dx /= len
  dy /= len
  const sign = side === 'left' ? 1 : -1
  const nx = -dy * sign
  const ny = dx * sign
  const r = HALF_PLANE_REACH
  const p1 = fromMercator(ax - dx * r, ay - dy * r)
  const p2 = fromMercator(ax + dx * r, ay + dy * r)
  const p3 = fromMercator(ax + dx * r + nx * r, ay + dy * r + ny * r)
  const p4 = fromMercator(ax - dx * r + nx * r, ay - dy * r + ny * r)
  return { polygon: [p1, p2, p3, p4, p1], line: [p1, p2] }
}

// Horizontal line through a point: a -> b runs west to east, so "left" is
// north and "right" is south.
export function latitudeLine(at: LngLat, shade: 'north' | 'south'): MarkData {
  return {
    kind: 'half_plane',
    data: { a: [at[0] - 1, at[1]], b: [at[0] + 1, at[1]], side: shade === 'north' ? 'left' : 'right' },
  }
}

// Vertical line through a point: a -> b runs south to north, so "left" is
// west and "right" is east.
export function longitudeLine(at: LngLat, shade: 'east' | 'west'): MarkData {
  return {
    kind: 'half_plane',
    data: { a: [at[0], at[1] - 1], b: [at[0], at[1] + 1], side: shade === 'west' ? 'left' : 'right' },
  }
}

// Region marks aren't drawn here -- they tint the region polygons themselves
// via feature-state (see HideAndSeekMap).
export function markToFeatures(markId: string, mark: MarkData): GeoJSON.Feature[] {
  const props = (role: MarkFeatureRole): MarkFeatureProps => ({ markId, role })

  switch (mark.kind) {
    case 'half_plane': {
      const { polygon, line } = halfPlane(mark.data.a, mark.data.b, mark.data.side)
      return [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [polygon] }, properties: props('shade') },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: props('line') },
      ]
    }
    case 'circle': {
      const ring = circleRing(mark.data.center, mark.data.radius_km)
      const shade: GeoJSON.Polygon =
        mark.data.shade === 'outside'
          ? { type: 'Polygon', coordinates: [boundsRing(), ring] }
          : { type: 'Polygon', coordinates: [[...ring].reverse()] }
      return [
        { type: 'Feature', geometry: shade, properties: props('shade') },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: ring }, properties: props('line') },
      ]
    }
    case 'freehand':
      return [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: mark.data.points },
          properties: props('line'),
        },
      ]
    case 'region':
      return []
  }
}

export function describeMark(mark: MarkData): string {
  switch (mark.kind) {
    case 'half_plane': {
      const { a, b, side } = mark.data
      if (a[1] === b[1]) return `Ruled out ${side === 'left' ? 'north' : 'south'} of a line`
      if (a[0] === b[0]) return `Ruled out ${side === 'left' ? 'west' : 'east'} of a line`
      return 'Ruled out one side of a line'
    }
    case 'circle':
      return `Ruled out ${mark.data.shade} ${mark.data.radius_km} km circle`
    case 'freehand':
      return 'Drawing'
    case 'region':
      return `Crossed out: ${mark.data.name}`
  }
}
