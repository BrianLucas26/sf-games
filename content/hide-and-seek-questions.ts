// Ground truth for Hide and Seek's question bank. Edit this file directly to
// add, remove, or reword questions -- pushing to main is the entire deploy
// step (see .github/workflows/deploy-functions.yml), same convention as
// content/lockout-challenges.ts.
//
// Seekers pick from this bank during a seeking round; each question can only
// be asked once per round (it grays out afterward). When the hiders answer,
// they draw `cost.draw` curses from the curse deck (content/hide-and-seek-curses.ts)
// and keep `cost.keep` of them.
//
// `id` is the stable key the game tracks "already asked this round" by --
// never reuse an old id for a different question. `category` just groups the
// bank in the UI (in first-appearance order). `answers` gives hiders fixed
// answer buttons; leave it off for a free-text answer (e.g. photo questions,
// where the answer is "sent it in the group chat").
//
// hide-and-seek-ask-question copies prompt/category/answers/cost onto that
// game's hide_and_seek_questions row when a question is asked, so editing
// this list never changes a question already asked in a game in progress.
//
// PLACEHOLDER BANK -- a handful of samples to exercise the system. Replace
// with the real questions.
export interface HideAndSeekCost {
  draw: number
  keep: number
}

export interface HideAndSeekQuestion {
  id: string
  category: string
  prompt: string
  description?: string
  cost: HideAndSeekCost
  answers?: string[]
}

export const HIDE_AND_SEEK_QUESTIONS: HideAndSeekQuestion[] = [
  // Relative
  {
    id: 'relative-north-south',
    category: 'Relative',
    prompt: 'Are you north or south of us?',
    description: "Compared to the seekers' position when the question was asked.",
    cost: { draw: 2, keep: 1 },
    answers: ['North', 'South'],
  },
  {
    id: 'relative-east-west',
    category: 'Relative',
    prompt: 'Are you east or west of us?',
    description: "Compared to the seekers' position when the question was asked.",
    cost: { draw: 2, keep: 1 },
    answers: ['East', 'West'],
  },

  // Matching
  {
    id: 'matching-neighborhood',
    category: 'Matching',
    prompt: 'Are you in the same neighborhood as us?',
    description: 'Uses the SF Planning neighborhood boundaries (toggle "Neighborhoods" on the map).',
    cost: { draw: 3, keep: 1 },
    answers: ['Yes', 'No'],
  },
  {
    id: 'matching-district',
    category: 'Matching',
    prompt: 'Are you in the same supervisor district as us?',
    description: 'Uses the 11 SF supervisor districts (toggle "Districts" on the map).',
    cost: { draw: 3, keep: 1 },
    answers: ['Yes', 'No'],
  },

  // Measuring
  {
    id: 'measuring-coast',
    category: 'Measuring',
    prompt: 'Are you closer to the coast than us?',
    description: 'Straight-line distance to the nearest shoreline (ocean or bay).',
    cost: { draw: 3, keep: 1 },
    answers: ['Closer', 'Farther'],
  },

  // Radar
  {
    id: 'radar-1km',
    category: 'Radar',
    prompt: 'Are you within 1 km of us?',
    cost: { draw: 2, keep: 1 },
    answers: ['Yes', 'No'],
  },
  {
    id: 'radar-3km',
    category: 'Radar',
    prompt: 'Are you within 3 km of us?',
    cost: { draw: 2, keep: 1 },
    answers: ['Yes', 'No'],
  },

  // Photo
  {
    id: 'photo-sky',
    category: 'Photo',
    prompt: 'Send us a photo of the sky directly above you.',
    description: 'Send it in the group chat, then answer here once it is sent.',
    cost: { draw: 1, keep: 1 },
  },
]

export function formatCost(cost: HideAndSeekCost): string {
  return cost.draw === cost.keep ? `Draw ${cost.draw}` : `Draw ${cost.draw}, keep ${cost.keep}`
}
