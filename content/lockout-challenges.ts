// Ground truth for Lockout's challenge bank. Edit this file directly to add,
// remove, or reword challenges -- pushing to main is the entire deploy step
// (see .github/workflows/deploy-functions.yml). No DB table, no sync script,
// no commands to run.
//
// `prompt` is the short version shown directly on the grid cell -- keep it
// tight (a few words), since board cells are small. `description` is an
// optional longer elaboration shown in the detail popup when you tap a
// cell; leave it off entirely for a challenge that's already
// self-explanatory as just the short prompt.
//
// lockout-start samples board_size^2 of these at random for each new game
// and copies the chosen prompt/description onto that game's lockout_cells
// rows, so editing this list never affects a game already in progress.
export interface LockoutChallenge {
  prompt: string
  description?: string
}

export const LOCKOUT_CHALLENGES: LockoutChallenge[] = [
  {
    prompt: 'Street performer photo',
    description: 'PLACEHOLDER: Take a photo with a street performer.',
  },
  {
    prompt: 'Pose with a mural',
    description: 'PLACEHOLDER: Find a mural and pose in front of it.',
  },
  {
    prompt: 'Order in another language',
    description: 'PLACEHOLDER: Order something in a language other than English.',
  },
  { prompt: 'Get a high five from a stranger' },
  {
    prompt: 'Ride the cable car',
    description: 'PLACEHOLDER: Ride a cable car for at least three stops.',
  },
  {
    prompt: 'Scenic overlook photo',
    description: 'PLACEHOLDER: Take a photo at a scenic overlook.',
  },
  { prompt: "Learn a dog's name" },
  {
    prompt: 'Read a random book aloud',
    description: 'PLACEHOLDER: Visit a bookstore and read the first page of a random book aloud.',
  },
  {
    prompt: 'Receipt ending in .00',
    description: 'PLACEHOLDER: Get a receipt with a total ending in .00.',
  },
  {
    prompt: 'Photo with public art',
    description: 'PLACEHOLDER: Take a photo with a piece of public art.',
  },
  {
    prompt: 'Find a pre-1920 building',
    description: 'PLACEHOLDER: Find a building built before 1920.',
  },
  { prompt: 'Buy the cheapest menu item' },
  {
    prompt: "Local's favorite coffee shop",
    description: 'PLACEHOLDER: Get a local to recommend their favorite coffee shop.',
  },
  {
    prompt: 'Team photo at a fountain',
    description: 'PLACEHOLDER: Take a photo of your team at a fountain.',
  },
  {
    prompt: 'Street named after a person',
    description: 'PLACEHOLDER: Find a street named after a person.',
  },
  {
    prompt: 'Sketch a storefront',
    description: 'PLACEHOLDER: Sketch the nearest storefront in under two minutes.',
  },
  {
    prompt: 'Find a payphone',
    description: 'PLACEHOLDER: Find a payphone (or prove none exist nearby).',
  },
  { prompt: 'Photo with a bike messenger' },
  {
    prompt: "Read a bench's plaque",
    description: 'PLACEHOLDER: Visit a park bench and read its dedication plaque.',
  },
  {
    prompt: 'Hand-painted restaurant sign',
    description: 'PLACEHOLDER: Find a restaurant with a hand-painted sign.',
  },
  {
    prompt: 'Copy a statue’s pose',
    description: 'PLACEHOLDER: Take a group photo doing the same pose as a nearby statue.',
  },
  {
    prompt: 'Three languages, one block',
    description: 'PLACEHOLDER: Find three different languages on storefront signs within a block.',
  },
  { prompt: "Barista's favorite drink" },
  {
    prompt: "Note a mailbox's pickup time",
    description: 'PLACEHOLDER: Find a mailbox and note its collection time.',
  },
  {
    prompt: 'Team arrow pointing north',
    description: 'PLACEHOLDER: Take a photo with your team forming a human arrow pointing north.',
  },
  {
    prompt: 'Historical marker or plaque',
    description: 'PLACEHOLDER: Find a plaque or marker commemorating a historical event.',
  },
  { prompt: "Ask for a hidden gem recommendation" },
  {
    prompt: 'Store open 25+ years',
    description: 'PLACEHOLDER: Find a store that has been open more than 25 years.',
  },
  { prompt: 'Team mid-jump photo' },
  {
    prompt: 'Time a crosswalk button',
    description: 'PLACEHOLDER: Find a crosswalk button and time how long the wait is.',
  },
]
