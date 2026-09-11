// Slugs shown as "Coming Soon!" and disabled on the create page -- doesn't
// touch game_types.is_active, since that would hide the game entirely
// rather than show it as coming soon. territory-control is a placeholder
// scaffold with no real mechanics yet. lockout, turf-war, and hide-and-seek
// are live for real play. Remove a slug here once that game is ready for
// real play.
export const COMING_SOON_SLUGS = new Set(['territory-control'])

// Playable games first (alphabetical), coming-soon games last (alphabetical).
export function sortComingSoonLast<T extends { slug: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aComing = COMING_SOON_SLUGS.has(a.slug)
    const bComing = COMING_SOON_SLUGS.has(b.slug)
    if (aComing !== bComing) return aComing ? 1 : -1
    return a.slug.localeCompare(b.slug)
  })
}
