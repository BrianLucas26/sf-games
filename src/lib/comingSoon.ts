// Slugs shown as "Coming Soon!" and disabled on the create page -- doesn't
// touch game_types.is_active, since that would hide the game entirely
// rather than show it as coming soon. turf-war is feature-complete but
// paused; hide-and-seek/territory-control are placeholder scaffolds with
// no real mechanics yet. lockout is live for real play. Remove a slug here
// once that game is ready for real play.
const BASE_COMING_SOON = ['turf-war', 'hide-and-seek', 'territory-control']

// Set VITE_UNLOCK_ALL_GAMES=true in .env.local to make every game playable in
// this build, so in-progress games can be played locally from main while
// production (which doesn't set it) keeps showing them as Coming Soon. Baked in
// at build time. UI gate only -- the edge functions for these games are still
// deployed and callable.
const UNLOCK_ALL = import.meta.env.VITE_UNLOCK_ALL_GAMES === 'true'

export const COMING_SOON_SLUGS = new Set(UNLOCK_ALL ? [] : BASE_COMING_SOON)

// Playable games first (alphabetical), coming-soon games last (alphabetical).
export function sortComingSoonLast<T extends { slug: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aComing = COMING_SOON_SLUGS.has(a.slug)
    const bComing = COMING_SOON_SLUGS.has(b.slug)
    if (aComing !== bComing) return aComing ? 1 : -1
    return a.slug.localeCompare(b.slug)
  })
}
