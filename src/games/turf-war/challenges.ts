// Turf War's challenge content lives here, not in a shared top-level
// "challenges" folder -- the shape (one prompt per neighborhood) is specific
// to this game. Territory Control and Lockout will define their own shapes
// (region_id + difficulty; no region_id at all, respectively) in their own
// game folders when they're built.

export interface TurfWarChallengeRow {
  region_id: string
  prompt: string
  created_at: string
}
