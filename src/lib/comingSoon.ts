// Slugs shown as "Coming Soon!" and disabled on the create page -- doesn't
// touch game_types.is_active, since that would hide the game entirely
// rather than show it as coming soon. turf-war/lockout are feature-complete
// but paused; hide-and-seek/territory-control are placeholder scaffolds
// with no real mechanics yet. Remove a slug here once that game is ready
// for real play.
export const COMING_SOON_SLUGS = new Set(['turf-war', 'lockout', 'hide-and-seek', 'territory-control'])
