// Ground truth for Lockout's challenge bank. Edit this file directly to add,
// remove, or reword challenges -- pushing to main is the entire deploy step
// (see .github/workflows/deploy-functions.yml). No DB table, no sync script,
// no commands to run.
//
// lockout-start samples board_size^2 of these at random for each new game
// and copies the chosen text onto that game's lockout_cells rows, so
// editing this list never affects a game already in progress.
export const LOCKOUT_CHALLENGES: string[] = [
  'PLACEHOLDER: Take a photo with a street performer.',
  'PLACEHOLDER: Find a mural and pose in front of it.',
  'PLACEHOLDER: Order something in a language other than English.',
  'PLACEHOLDER: Get a stranger to give you a high five.',
  'PLACEHOLDER: Ride a cable car for at least three stops.',
  'PLACEHOLDER: Take a photo at a scenic overlook.',
  'PLACEHOLDER: Find a dog and learn its name.',
  'PLACEHOLDER: Visit a bookstore and read the first page of a random book aloud.',
  'PLACEHOLDER: Get a receipt with a total ending in .00.',
  'PLACEHOLDER: Take a photo with a piece of public art.',
  'PLACEHOLDER: Find a building built before 1920.',
  'PLACEHOLDER: Buy the cheapest item on a menu.',
  'PLACEHOLDER: Get a local to recommend their favorite coffee shop.',
  'PLACEHOLDER: Take a photo of your team at a fountain.',
  'PLACEHOLDER: Find a street named after a person.',
  'PLACEHOLDER: Sketch the nearest storefront in under two minutes.',
  'PLACEHOLDER: Find a payphone (or prove none exist nearby).',
  'PLACEHOLDER: Get a photo with a bike messenger.',
  'PLACEHOLDER: Visit a park bench and read its dedication plaque.',
  'PLACEHOLDER: Find a restaurant with a hand-painted sign.',
  'PLACEHOLDER: Take a group photo doing the same pose as a nearby statue.',
  'PLACEHOLDER: Find three different languages on storefront signs within a block.',
  'PLACEHOLDER: Get a barista to tell you their favorite drink.',
  'PLACEHOLDER: Find a mailbox and note its collection time.',
  'PLACEHOLDER: Take a photo with your team forming a human arrow pointing north.',
  'PLACEHOLDER: Find a plaque or marker commemorating a historical event.',
  'PLACEHOLDER: Get a stranger to recommend a nearby hidden gem.',
  'PLACEHOLDER: Find a store that has been open more than 25 years.',
  'PLACEHOLDER: Take a photo of the whole team mid-jump.',
  'PLACEHOLDER: Find a crosswalk button and time how long the wait is.',
]
