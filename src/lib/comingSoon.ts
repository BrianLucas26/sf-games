// Temporary: both games are feature-complete but not open for new play yet.
// Remove a slug here to make that game selectable again -- doesn't touch
// game_types.is_active, since that would hide it entirely rather than show
// it as "Coming Soon!".
export const COMING_SOON_SLUGS = new Set(['turf-war', 'lockout'])
