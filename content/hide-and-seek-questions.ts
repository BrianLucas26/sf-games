// Ground truth for Hide and Seek's question bank, transcribed from the Jet Lag:
// The Game hide and seek card game. Edit this file directly to add, remove, or
// reword questions -- pushing to main is the entire deploy step (see
// .github/workflows/deploy-functions.yml), same convention as
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
// GAME SIZE: `sizes` lists which game sizes offer the question; leave it off
// for every size. The cards print three sizes and this game has two, mapped
// the same way as the curse deck (our 'small' = the card's S, our 'large' =
// the card's M):
//
//     card "All Games"    -> no `sizes`
//     card "Medium & Up"  -> sizes: ['large']
//     card "Large Only"   -> not transcribed (no size of ours offers it)
//
// `minutes` is the answer time printed on the card, shown as text only -- the
// app doesn't time it. Photos print "S/M: 10, L: 20"; both our sizes are S/M.
//
// `input` makes the seeker type a value when asking (Radar's "choose your own
// distance"); it replaces `{input}` in the prompt.
//
// hide-and-seek-ask-question copies prompt/category/answers/cost onto that
// game's hide_and_seek_questions row when a question is asked, so editing
// this list never changes a question already asked in a game in progress.
import type { HideAndSeekGameSize } from './hide-and-seek-curses.ts'

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
  minutes: number
  answers?: string[]
  sizes?: HideAndSeekGameSize[]
  input?: { label: string; placeholder: string; maxLength: number }
}

const MATCHING = { category: 'Matching', cost: { draw: 3, keep: 1 }, minutes: 5, answers: ['Yes', 'No'] }
const MEASURING = { category: 'Measuring', cost: { draw: 3, keep: 1 }, minutes: 5, answers: ['Closer', 'Further'] }
const THERMOMETER = { category: 'Thermometer', cost: { draw: 2, keep: 1 }, minutes: 5, answers: ['Hotter', 'Colder'] }
const RADAR = { category: 'Radar', cost: { draw: 2, keep: 1 }, minutes: 5, answers: ['Yes', 'No'] }
const TENTACLES = { category: 'Tentacles', cost: { draw: 4, keep: 2 }, minutes: 5, sizes: ['large'] as HideAndSeekGameSize[] }
const PHOTO = { category: 'Photo', cost: { draw: 1, keep: 1 }, minutes: 10 }

const SEND_IN_CHAT = 'Send it in the group chat, then answer here once it is sent.'
const MEDIUM_AND_UP: HideAndSeekGameSize[] = ['large']

function matching(id: string, thing: string): HideAndSeekQuestion {
  return { ...MATCHING, id: `matching-${id}`, prompt: `Is your nearest ${thing} the same as my nearest ${thing}?` }
}

function measuring(id: string, thing: string): HideAndSeekQuestion {
  return { ...MEASURING, id: `measuring-${id}`, prompt: `Compared to me, are you closer to or further from ${thing}?` }
}

function thermometer(id: string, distance: string, sizes?: HideAndSeekGameSize[]): HideAndSeekQuestion {
  return {
    ...THERMOMETER,
    id: `thermometer-${id}`,
    prompt: `I just traveled at least ${distance}. Am I hotter or colder?`,
    description: 'Hotter = the seekers are now closer to the hiders than where they started.',
    ...(sizes && { sizes }),
  }
}

function radar(id: string, distance: string): HideAndSeekQuestion {
  return { ...RADAR, id: `radar-${id}`, prompt: `Are you within ${distance} of me?` }
}

function tentacles(id: string, places: string, distance: string): HideAndSeekQuestion {
  return {
    ...TENTACLES,
    id: `tentacles-${id}`,
    prompt: `Of all the ${places} within ${distance} of me, which are you closest to?`,
    description: 'If the hiders are not within that distance of the seekers, they answer "None".',
  }
}

function photo(id: string, subject: string, requirements: string, sizes?: HideAndSeekGameSize[]): HideAndSeekQuestion {
  return {
    ...PHOTO,
    id: `photo-${id}`,
    prompt: `Send a photo of ${subject}.`,
    description: `${requirements} ${SEND_IN_CHAT}`,
    ...(sizes && { sizes }),
  }
}

export const HIDE_AND_SEEK_QUESTIONS: HideAndSeekQuestion[] = [
  // Matching -- "Is your nearest _____ the same as my nearest _____?"
  matching('commercial-airport', 'commercial airport'),
  matching('transit-line', 'transit line'),
  matching('station-name-length', "station's name length"),
  matching('street-or-path', 'street or path'),
  matching('1st-admin', '1st admin division (state)'),
  matching('2nd-admin', '2nd admin division (county)'),
  matching('3rd-admin', '3rd admin division (municipality, city, or town)'),
  matching('4th-admin', '4th admin division (borough)'),
  matching('mountain', 'mountain'),
  matching('landmass', 'landmass'),
  matching('park', 'park'),
  matching('amusement-park', 'amusement park'),
  matching('zoo', 'zoo'),
  matching('aquarium', 'aquarium'),
  matching('golf-course', 'golf course'),
  matching('museum', 'museum'),
  matching('movie-theatre', 'movie theatre'),
  matching('hospital', 'hospital'),
  matching('library', 'library'),
  matching('foreign-consulate', 'foreign consulate'),
  // SF-specific additions (not on the cards), using the map's region layers.
  {
    ...MATCHING,
    id: 'matching-neighborhood',
    prompt: 'Are you in the same neighborhood as me?',
    description: 'Uses the SF Planning neighborhood boundaries (toggle "Neighborhoods" on the map).',
  },
  {
    ...MATCHING,
    id: 'matching-district',
    prompt: 'Are you in the same supervisor district as me?',
    description: 'Uses the 11 SF supervisor districts (toggle "Districts" on the map).',
  },

  // Measuring -- "Compared to me, are you closer to or further from _____?"
  measuring('commercial-airport', 'a commercial airport'),
  measuring('high-speed-train-line', 'a high speed train line'),
  measuring('rail-station', 'a rail station'),
  measuring('international-border', 'an international border'),
  measuring('1st-admin-border', 'a 1st admin border (state)'),
  measuring('2nd-admin-border', 'a 2nd admin border (county)'),
  measuring('4th-admin-border', 'a 4th admin border (borough)'),
  measuring('sea-level', 'sea level'),
  measuring('body-of-water', 'a body of water'),
  measuring('coastline', 'a coastline'),
  measuring('mountain', 'a mountain'),
  measuring('park', 'a park'),
  measuring('amusement-park', 'an amusement park'),
  measuring('zoo', 'a zoo'),
  measuring('aquarium', 'an aquarium'),
  measuring('golf-course', 'a golf course'),
  measuring('museum', 'a museum'),
  measuring('movie-theatre', 'a movie theatre'),
  measuring('hospital', 'a hospital'),
  measuring('library', 'a library'),
  measuring('foreign-consulate', 'a foreign consulate'),

  // Thermometer
  thermometer('half-mile', '0.5 mi (805 m)'),
  thermometer('3mi', '3 mi (4.8 km)'),
  thermometer('10mi', '10 mi (16 km)', MEDIUM_AND_UP),

  // Radar
  radar('quarter-mile', '0.25 mi (402 m)'),
  radar('half-mile', '0.5 mi (805 m)'),
  radar('1mi', '1 mi (1.6 km)'),
  radar('3mi', '3 mi (4.8 km)'),
  radar('5mi', '5 mi (8 km)'),
  radar('10mi', '10 mi (16 km)'),
  radar('25mi', '25 mi (40 km)'),
  radar('50mi', '50 mi (80.5 km)'),
  radar('100mi', '100 mi (160.9 km)'),
  {
    ...RADAR,
    id: 'radar-choose',
    prompt: 'Are you within {input} of me?',
    description: 'Pick your own distance.',
    input: { label: 'Distance', placeholder: 'e.g. 2 mi', maxLength: 30 },
  },

  // Tentacles (Medium & Up)
  tentacles('museums', 'museums', '1 mi (1.6 km)'),
  tentacles('libraries', 'libraries', '1 mi (1.6 km)'),
  tentacles('movie-theatres', 'movie theatres', '1 mi (1.6 km)'),
  tentacles('hospitals', 'hospitals', '1 mi (1.6 km)'),

  // Photo -- All Games
  photo('tree', 'a tree', 'Must include the entire tree.'),
  photo('sky', 'the sky', 'Place your phone on the ground and shoot directly up.'),
  photo('you', 'you', 'Selfie mode, arm parallel to the ground, fully extended.'),
  photo('widest-street', 'the widest street', 'Must include both sides of the street.'),
  photo(
    'tallest-structure',
    'the tallest structure in your sightline',
    'Tallest from your current perspective / sightline. Must include the top and both sides. The top must be in the top third of the frame.',
  ),
  photo(
    'building-from-station',
    'any building visible from a station',
    'Must stand directly outside a transit station entrance (with multiple entrances, you may choose). Must include the roof and both sides, with the top of the building in the top third of the frame.',
  ),

  // Photo -- Medium & Up
  photo(
    'tallest-building-from-station',
    'the tallest building visible from a station',
    'Tallest from your perspective / sightline. Must stand directly outside a transit station entrance (with multiple entrances, you may choose). Must include the roof and both sides, with the top of the building in the top third of the frame.',
    MEDIUM_AND_UP,
  ),
  photo(
    'trace-nearest-street',
    'the nearest street or path, traced',
    'The street / path must be visible on a mapping app. Trace intersection to intersection.',
    MEDIUM_AND_UP,
  ),
  photo('two-buildings', 'two buildings', "Must include a 5'x5' section with three distinct elements.", MEDIUM_AND_UP),
  photo(
    'restaurant-interior',
    'a restaurant interior',
    'No zoom. Must take the photo from outside, through a window.',
    MEDIUM_AND_UP,
  ),
  photo('train-platform', 'a train platform', "Must include a 5'x5' section with three distinct elements.", MEDIUM_AND_UP),
  photo(
    'park',
    'a park',
    "No zoom, phone perpendicular to the ground. Must stand 5' away from any obstruction.",
    MEDIUM_AND_UP,
  ),
  photo(
    'grocery-aisle',
    'a grocery store aisle',
    'No zoom. Stand at the end of the aisle and shoot directly down it.',
    MEDIUM_AND_UP,
  ),
  photo(
    'place-of-worship',
    'a place of worship',
    "Must include a 5'x5' section with three distinct elements.",
    MEDIUM_AND_UP,
  ),
]

export function questionsForSize(size: HideAndSeekGameSize): HideAndSeekQuestion[] {
  return HIDE_AND_SEEK_QUESTIONS.filter((q) => !q.sizes || q.sizes.includes(size))
}

/** The prompt as asked, with the seeker's typed value (if the question takes one) filled in. */
export function fillPrompt(question: HideAndSeekQuestion, input: string | undefined): string {
  return question.input ? question.prompt.replace('{input}', (input ?? '').trim()) : question.prompt
}

export function formatCost(cost: HideAndSeekCost): string {
  return cost.draw === cost.keep ? `Draw ${cost.draw}` : `Draw ${cost.draw}, keep ${cost.keep}`
}
