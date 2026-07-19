// Placeholder -- Territory Control has no real board yet. Will likely reuse
// src/lib/map/RegionMap.tsx once the district-claiming mechanics land,
// similar to how Turf War uses it.
export function Board(_props: { gameId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-faint">
      Territory Control isn't implemented yet.
    </div>
  )
}
