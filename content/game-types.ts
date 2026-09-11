// Ground truth for game type display text, keyed by slug. Edit this file
// directly to reword a name/description -- pushing to main is the entire
// deploy step, same convention as content/turf-war-challenges.ts and
// content/lockout-challenges.ts. game_types itself only keeps slug/id/
// is_active -- nothing here is relational, so it never needed to be a
// column at all.
export interface GameTypeContent {
  name: string
  description: string
}

export const GAME_TYPE_CONTENT: Record<string, GameTypeContent> = {
  'turf-war': {
    name: 'Turf War',
    description:
      'Complete challenges to claim SF neighborhoods -- largest connected territory held by the end wins.',
  },
  lockout: {
    name: 'Lockout',
    description: 'Two teams race to complete challenges on a shared board -- first to a bingo or a majority wins.',
  },
  'hide-and-seek': {
    name: 'Hide and Seek',
    description:
      'Teams take turns hiding across SF -- seekers ask questions to close in, hiders curse them to slow them down. Longest hide wins.',
  },
  'territory-control': {
    name: 'Territory Control',
    description: 'Complete challenges to claim SF districts -- most districts controlled by the end wins.',
  },
}
