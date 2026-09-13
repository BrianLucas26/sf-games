import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { TextInput } from '@/components/Field'
import type { RegionRow } from '@/types/geo'
import { addMapMark, clearMapMarks, deleteMapMark } from '../api'
import type { HideAndSeekMapMarkRow, LngLat, MarkData, RegionSetKey } from '../types'
import { describeMark, latitudeLine, longitudeLine } from './geometry'
import { HideAndSeekMap, type AskPoint } from './HideAndSeekMap'
import { getCurrentLngLat } from './location'
import { REGION_SET_COLORS } from './style'

type Tool = 'pan' | 'ns' | 'ew' | 'line' | 'circle' | 'region' | 'pen'

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'pan', label: 'Move', hint: '' },
  { id: 'ns', label: 'N/S line', hint: 'Tap the map (or use your location) to place a horizontal line, then pick which side to rule out.' },
  { id: 'ew', label: 'E/W line', hint: 'Tap the map (or use your location) to place a vertical line, then pick which side to rule out.' },
  { id: 'line', label: 'Line', hint: 'Tap two points to draw a line, then pick which side to rule out.' },
  { id: 'circle', label: 'Circle', hint: 'Tap the center (or use your location), set a radius, then rule out inside or outside.' },
  { id: 'region', label: 'Cross out', hint: 'Tap regions to select them, then cross out the selection -- or everything except it.' },
  { id: 'pen', label: 'Pen', hint: 'Drag to draw. Pinch with two fingers to zoom.' },
]

const REGION_SET_LABELS: Record<RegionSetKey, string> = { neighborhoods: 'Neighborhoods', districts: 'Districts' }
const OVERLAY_STORAGE_KEY = 'hide-and-seek-overlays'

function loadOverlays(): Record<RegionSetKey, boolean> {
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY)
    if (raw) return { neighborhoods: false, districts: false, ...JSON.parse(raw) }
  } catch {
    // Storage blocked -- fall through to the default.
  }
  return { neighborhoods: false, districts: false }
}

function saveOverlays(overlays: Record<RegionSetKey, boolean>) {
  try {
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(overlays))
  } catch {
    // Not worth surfacing -- it's just a remembered toggle.
  }
}

function Pill({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'border-accent bg-accent/15 text-ink' : 'border-border-strong text-muted hover:text-ink'
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  )
}

interface MapPanelProps {
  gameId: string
  regions: Record<RegionSetKey, RegionRow[]>
  marks: HideAndSeekMapMarkRow[]
  askPoints: AskPoint[]
  // Seekers during an active round; everyone else gets overlays + location only.
  editable: boolean
  onMarksChanged: () => Promise<unknown>
}

export function MapPanel({ gameId, regions, marks, askPoints, editable, onMarksChanged }: MapPanelProps) {
  const [overlays, setOverlays] = useState(loadOverlays)
  const [tool, setTool] = useState<Tool>('pan')
  const [point, setPoint] = useState<LngLat | null>(null)
  const [point2, setPoint2] = useState<LngLat | null>(null)
  const [nsShade, setNsShade] = useState<'north' | 'south'>('north')
  const [ewShade, setEwShade] = useState<'east' | 'west'>('east')
  const [lineSide, setLineSide] = useState<'left' | 'right'>('left')
  const [circleShade, setCircleShade] = useState<'inside' | 'outside'>('outside')
  const [radiusKm, setRadiusKm] = useState('1')
  const [regionSet, setRegionSet] = useState<RegionSetKey>('neighborhoods')
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeTool = editable ? tool : 'pan'
  const radius = Number(radiusKm)
  const radiusValid = radius > 0 && radius <= 50

  const draft = useMemo<MarkData | null>(() => {
    if (!point) return null
    switch (activeTool) {
      case 'ns':
        return latitudeLine(point, nsShade)
      case 'ew':
        return longitudeLine(point, ewShade)
      case 'line':
        return point2 ? { kind: 'half_plane', data: { a: point, b: point2, side: lineSide } } : null
      case 'circle':
        return radiusValid ? { kind: 'circle', data: { center: point, radius_km: radius, shade: circleShade } } : null
      default:
        return null
    }
  }, [activeTool, point, point2, nsShade, ewShade, lineSide, circleShade, radius, radiusValid])

  // The line tool's tapped points, drawn as dots so the first tap shows up
  // before there's a line to draw.
  const draftPoints = useMemo<LngLat[]>(
    () => (activeTool === 'line' ? [point, point2].filter((p): p is LngLat => p !== null) : []),
    [activeTool, point, point2],
  )

  const draftReady = draft !== null

  function toggleOverlay(set: RegionSetKey) {
    const next = { ...overlays, [set]: !overlays[set] }
    setOverlays(next)
    saveOverlays(next)
  }

  function selectTool(next: Tool) {
    setTool(next)
    setPoint(null)
    setPoint2(null)
    setSelectedRegionIds([])
    setError(null)
  }

  const crossedOutIds = useMemo(
    () => new Set(marks.flatMap((m) => (m.kind === 'region' ? m.data.region_ids : []))),
    [marks],
  )

  // Saves one mark for the whole action, so Undo brings it all back at once.
  function crossOut(exceptSelected: boolean) {
    const selected = new Set(selectedRegionIds)
    const targets = regions[regionSet].filter((r) => selected.has(r.id) !== exceptSelected && !crossedOutIds.has(r.id))
    if (targets.length === 0) {
      setError('Those are already crossed out.')
      return
    }
    run(async () => {
      await addMapMark({
        gameId,
        mark: {
          kind: 'region',
          data: { region_set: regionSet, region_ids: targets.map((r) => r.id), names: targets.map((r) => r.name) },
        },
      })
      setSelectedRegionIds([])
    })
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onMarksChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  function handleMapClick(at: LngLat, hit: Partial<Record<RegionSetKey, RegionRow>>) {
    switch (activeTool) {
      case 'ns':
      case 'ew':
      case 'circle':
        setPoint(at)
        return
      case 'line':
        if (!point || point2) {
          setPoint(at)
          setPoint2(null)
        } else {
          setPoint2(at)
        }
        return
      case 'region': {
        const region = hit[regionSet]
        if (!region) {
          setError(`Tap inside one of the ${REGION_SET_LABELS[regionSet].toLowerCase()}.`)
          return
        }
        setError(null)
        setSelectedRegionIds((ids) =>
          ids.includes(region.id) ? ids.filter((id) => id !== region.id) : [...ids, region.id],
        )
        return
      }
    }
  }

  function handleStroke(points: LngLat[]) {
    run(() => addMapMark({ gameId, mark: { kind: 'freehand', data: { points } } }))
  }

  async function placeAtMyLocation() {
    setLocating(true)
    setError(null)
    const at = await getCurrentLngLat()
    setLocating(false)
    if (!at) {
      setError("Couldn't get your location -- tap the map instead.")
      return
    }
    setPoint(at)
  }

  function saveDraft() {
    if (!draft || !draftReady) return
    run(async () => {
      await addMapMark({ gameId, mark: draft })
      setPoint(null)
      setPoint2(null)
    })
  }

  const hint = TOOLS.find((t) => t.id === activeTool)?.hint
  const latestMark = marks[marks.length - 1]

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-faint uppercase">Show</span>
        {(['neighborhoods', 'districts'] as const).map((set) => (
          <Pill key={set} active={overlays[set]} onClick={() => toggleOverlay(set)} color={REGION_SET_COLORS[set]}>
            {REGION_SET_LABELS[set]}
          </Pill>
        ))}
      </div>

      {editable && (
        <div className="flex items-start gap-2">
          <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
            {TOOLS.map((t) => (
              <Pill key={t.id} active={tool === t.id} onClick={() => selectTool(t.id)}>
                {t.label}
              </Pill>
            ))}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={busy || !latestMark}
              onClick={() => latestMark && run(() => deleteMapMark({ gameId, markId: latestMark.id }))}
            >
              Undo
            </Button>
            <Button
              variant="danger"
              className="px-3 py-1.5 text-xs"
              disabled={busy || marks.length === 0}
              onClick={() => {
                if (confirm("Clear all of your team's markup for this round?")) run(() => clearMapMarks(gameId))
              }}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}

      {editable && activeTool !== 'pan' && (
        <div className="space-y-2.5 rounded-xl border border-border bg-surface p-3 text-sm">
          {hint && <p className="text-xs text-muted">{hint}</p>}

          {activeTool === 'region' && (
            <div className="flex flex-wrap gap-1.5">
              {(['neighborhoods', 'districts'] as const).map((set) => (
                <Pill
                  key={set}
                  active={regionSet === set}
                  color={REGION_SET_COLORS[set]}
                  onClick={() => {
                    setRegionSet(set)
                    setSelectedRegionIds([])
                  }}
                >
                  {REGION_SET_LABELS[set]}
                </Pill>
              ))}
            </div>
          )}

          {activeTool === 'region' && (
            <div className="flex flex-wrap gap-2">
              <Button
                className="px-3 py-1.5 text-xs"
                disabled={busy || selectedRegionIds.length === 0}
                onClick={() => crossOut(false)}
              >
                Cross out selected ({selectedRegionIds.length})
              </Button>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={busy || selectedRegionIds.length === 0}
                onClick={() => crossOut(true)}
              >
                Cross out all except selected
              </Button>
              {selectedRegionIds.length > 0 && (
                <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setSelectedRegionIds([])}>
                  Clear selection
                </Button>
              )}
            </div>
          )}

          {['ns', 'ew', 'circle'].includes(activeTool) && (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={placeAtMyLocation} disabled={locating}>
              {locating ? 'Locating…' : 'Use my location'}
            </Button>
          )}

          {activeTool === 'ns' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Rule out:</span>
              <Pill active={nsShade === 'north'} onClick={() => setNsShade('north')}>North</Pill>
              <Pill active={nsShade === 'south'} onClick={() => setNsShade('south')}>South</Pill>
            </div>
          )}

          {activeTool === 'ew' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Rule out:</span>
              <Pill active={ewShade === 'east'} onClick={() => setEwShade('east')}>East</Pill>
              <Pill active={ewShade === 'west'} onClick={() => setEwShade('west')}>West</Pill>
            </div>
          )}

          {activeTool === 'line' && point2 && (
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={() => setLineSide(lineSide === 'left' ? 'right' : 'left')}
            >
              Flip ruled-out side
            </Button>
          )}

          {activeTool === 'circle' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <TextInput
                type="number"
                min={0.1}
                max={50}
                step={0.1}
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="w-20 py-1.5"
                aria-label="Radius in km"
              />
              <span className="text-xs text-muted">km · Rule out:</span>
              <Pill active={circleShade === 'inside'} onClick={() => setCircleShade('inside')}>Inside</Pill>
              <Pill active={circleShade === 'outside'} onClick={() => setCircleShade('outside')}>Outside</Pill>
            </div>
          )}

          {['ns', 'ew', 'line', 'circle'].includes(activeTool) && (
            <div className="flex gap-2">
              <Button className="px-3 py-1.5 text-xs" onClick={saveDraft} disabled={!draftReady || busy}>
                {busy ? 'Saving…' : 'Save to map'}
              </Button>
              {point && (
                <Button
                  variant="ghost"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => {
                    setPoint(null)
                    setPoint2(null)
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <HideAndSeekMap
        neighborhoods={regions.neighborhoods}
        districts={regions.districts}
        // The cross-out tool shows its region set only while it's in use;
        // the Show toggles stay the player's own setting.
        showNeighborhoods={overlays.neighborhoods || (activeTool === 'region' && regionSet === 'neighborhoods')}
        showDistricts={overlays.districts || (activeTool === 'region' && regionSet === 'districts')}
        marks={marks}
        selectedRegionIds={activeTool === 'region' ? selectedRegionIds : undefined}
        draft={draft}
        draftPoints={draftPoints}
        askPoints={askPoints}
        penActive={activeTool === 'pen'}
        onMapClick={editable ? handleMapClick : undefined}
        onStroke={editable ? handleStroke : undefined}
        className="h-[55vh] min-h-[320px] w-full"
      />

      {editable && marks.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-3">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium tracking-wide text-faint uppercase">
            Team markup ({marks.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {[...marks].reverse().map((mark) => (
              <li key={mark.id} className="flex items-center justify-between gap-3 text-sm text-ink">
                <span className="truncate">{describeMark(mark)}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-faint hover:text-danger"
                  disabled={busy}
                  onClick={() => run(() => deleteMapMark({ gameId, markId: mark.id }))}
                  aria-label="Delete mark"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
