// Ground truth for Hide and Seek's curse deck. Edit this file directly to
// add, remove, or reword curses -- pushing to main is the entire deploy step,
// same convention as content/hide-and-seek-questions.ts.
//
// Every round starts with a fresh, shuffled deck built from this list
// (`copies` of each curse, default 1). Hiders draw from it whenever they
// answer a question and can play a held curse at any time during the round.
// When the draw pile runs out, every curse not currently in the hiders' hand
// is shuffled back in.
//
// How a played curse behaves for the seekers:
//   - durationMinutes set  -> lasts that long, then clears itself.
//   - durationMinutes omitted -> a task; lasts until a seeker taps "Done".
//   - blocksQuestions (default true) -> the question bank is locked while the
//     curse is active. Set false for a standing rule (e.g. "walk only") that
//     the seekers just have to follow while still asking questions.
//
// hide-and-seek-start-round snapshots the deck at round start and
// hide-and-seek-answer-question copies name/description/duration onto the
// hiders' hand rows as they're drawn, so editing this list never changes a
// curse already drawn in a game in progress.
//
// PLACEHOLDER DECK -- a handful of samples to exercise the system. Replace
// with the real curses.
export interface HideAndSeekCurse {
  id: string
  name: string
  description: string
  copies?: number
  durationMinutes?: number
  blocksQuestions?: boolean
}

export const HIDE_AND_SEEK_CURSES: HideAndSeekCurse[] = [
  {
    id: 'curse-of-silence',
    name: 'Curse of Silence',
    description: 'Seekers may not ask a question for the next 10 minutes.',
    copies: 2,
    durationMinutes: 10,
  },
  {
    id: 'curse-of-the-tourist',
    name: 'Curse of the Tourist',
    description:
      'Before asking another question, the seekers must send the hiders a selfie with a landmark or mural in the background.',
    copies: 2,
  },
  {
    id: 'curse-of-the-riddle',
    name: 'Curse of the Riddle',
    description:
      'The hiders send the seekers a riddle. The seekers must solve it before asking another question.',
  },
  {
    id: 'curse-of-the-snack-run',
    name: 'Curse of the Snack Run',
    description: 'Before asking another question, each seeker must buy and eat a snack they have never tried before.',
  },
  {
    id: 'curse-of-tired-feet',
    name: 'Curse of Tired Feet',
    description: 'For the next 15 minutes the seekers may not use any transit or vehicles -- walking only.',
    copies: 2,
    durationMinutes: 15,
    blocksQuestions: false,
  },
  {
    id: 'curse-of-the-long-way',
    name: 'Curse of the Long Way',
    description: 'For the next 20 minutes the seekers may not ride Muni Metro or BART -- buses, cable cars, and walking only.',
    durationMinutes: 20,
    blocksQuestions: false,
  },
]
