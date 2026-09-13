// Ground truth for Hide and Seek's curse deck, transcribed from the Jet Lag:
// The Game hide and seek card game (base game + expansion 1). Edit this file
// directly to add, remove, or reword curses -- pushing to main is the entire
// deploy step, same convention as content/hide-and-seek-questions.ts.
//
// Every round starts with a fresh, shuffled deck built from this list
// (`copies` of each curse, default 1). Hiders draw from it whenever they
// answer a question and can play a held curse at any time during the round.
// When the draw pile runs out, every curse not currently in the hiders' hand
// is shuffled back in.
//
// SIZE-DEPENDENT VALUES are written inline exactly as the cards print them --
// "[S5, M10, L15]". The printed cards have three sizes; this game has two, and
// they map to the two SMALLEST printed values:
//
//     our 'small' -> the card's S value
//     our 'large' -> the card's M value   (the printed L value goes unused)
//
// So a card that prints "[S5, M10, L15] minutes" runs 5 minutes in a small
// game and 10 in a large one. Card text can therefore be pasted in verbatim.
// A new card written from scratch can also use the two-value form
// "[S5, L10]", which formatSized() accepts just the same.
//
// formatSized() substitutes the right number wherever text is shown (the size
// is a lobby setting); `durationMinutes` repeats the same numbers in a
// machine-readable form for the curses this app actually times, and likewise
// only its first two entries are ever read.
//
// WHAT THE APP ENFORCES (everything else is text the players honor themselves):
//   - `discardCost`      curses the hider must discard from hand to cast. A
//                        number, or 'hand' for "discard your hand". The play
//                        button is blocked until they can pay it.
//   - `benchmark`        the hider reports a number when casting (rocks in the
//                        tower, minutes of bird footage); shown to the seekers.
//   - `blocksQuestions`  the seekers' question bank locks while the curse is up.
//   - `clear` / `durationMinutes`  how the curse ends:
//       'task'     -> until a seeker marks it done
//       'timer'    -> runs out on its own after durationMinutes
//       'deadline' -> whichever comes first (done, or the clock)
//       'round'    -> stands for the rest of the round; nothing to clear
//
// Costs and effects that lean on Jet Lag mechanics this app doesn't model yet
// (time bonuses, power-ups/vetoes/randomizes, hiding zone radii, the endgame,
// the tracker, dice) are transcribed verbatim and left to the players -- no
// discardCost, no timer. They're marked `unsupported: true` so they're easy to
// find later when deciding which to wire up for real.

export type HideAndSeekGameSize = 'small' | 'large'

/**
 * Printed card values, smallest first: [small, large] or, when transcribed
 * straight off a card, [small, large, unused]. Only the first two are read.
 */
export type SizedMinutes = number | [number, number] | [number, number, number]

export type CurseClearMode = 'task' | 'timer' | 'deadline' | 'round'

export interface HideAndSeekCurse {
  id: string
  name: string
  expansion: 'base' | 'expansion-1'
  description: string
  castingCost: string
  notes?: string
  copies?: number
  clear: CurseClearMode
  blocksQuestions?: boolean
  durationMinutes?: SizedMinutes
  discardCost?: number | 'hand'
  benchmark?: { label: string; unit: string }
  /** Uses a mechanic this app doesn't model yet -- players settle it themselves. */
  unsupported?: boolean
}

// Matches a printed size value: three-value as the cards print it
// ("[S0.5, M1, L3]"), or the two-value form ("[S0.5, L1]").
const SIZED_PATTERN = /\[S([^,\]]+),\s*(?:M([^,\]]+),\s*)?L([^\]]+)\]/g

/** Replaces every printed size value in card text with this game's number. */
export function formatSized(text: string, size: HideAndSeekGameSize): string {
  return text.replace(SIZED_PATTERN, (_match, small, medium, large) =>
    // On a three-value card the M value is our large; the printed L is unused.
    (size === 'small' ? small : (medium ?? large)).trim(),
  )
}

export function sizedValue(value: SizedMinutes, size: HideAndSeekGameSize): number {
  if (typeof value === 'number') return value
  return value[size === 'small' ? 0 : 1]
}

// What gets copied onto a hand card when it's drawn, so a mid-game edit to
// this file never changes a curse already in someone's hand.
export interface ResolvedCurse {
  name: string
  description: string
  castingCost: string
  notes: string | null
  clear: CurseClearMode
  blocksQuestions: boolean
  durationMinutes: number | null
  discardCost: number | null
  discardHand: boolean
  benchmarkLabel: string | null
}

export function resolveCurse(curse: HideAndSeekCurse, size: HideAndSeekGameSize): ResolvedCurse {
  return {
    name: curse.name,
    description: formatSized(curse.description, size),
    castingCost: formatSized(curse.castingCost, size),
    notes: curse.notes ? formatSized(curse.notes, size) : null,
    clear: curse.clear,
    blocksQuestions: curse.blocksQuestions ?? false,
    durationMinutes: curse.durationMinutes === undefined ? null : sizedValue(curse.durationMinutes, size),
    discardCost: typeof curse.discardCost === 'number' ? curse.discardCost : null,
    discardHand: curse.discardCost === 'hand',
    benchmarkLabel: curse.benchmark ? `${curse.benchmark.label} (${curse.benchmark.unit})` : null,
  }
}

export const HIDE_AND_SEEK_CURSES: HideAndSeekCurse[] = [
  {
    id: 'anonymous-benefactor',
    name: 'Curse of the Anonymous Benefactor',
    expansion: 'expansion-1',
    description: `Seekers must place one dollar/euro/pound (or your country's equivalent) in a public place and confirm that it has been taken by a stranger before asking another question. Seekers cannot speak directly to any strangers about the money.`,
    castingCost: `Donate money under the same circumstances.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'archaeologist',
    name: 'Curse of the Archaeologist',
    expansion: 'expansion-1',
    description: `Send the seekers a photo of a building or structure whose age you can verify to within a century. The seekers must find a building or structure (whose age they can also verify) from the same century or earlier before asking another question.`,
    castingCost: `A standard photo of a building or structure.`,
    notes: `"Building or structure" encompasses any manmade objects. To verify the age, you must have at least one credible source that specifically references that object. Partially rebuilt or renovated structures may use their original build date, but fully rebuilt structures (or structures designed to emulate an older structure) may not.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'bargain-hunter',
    name: 'Curse of the Bargain Hunter',
    expansion: 'expansion-1',
    description: `Send the seekers a picture of a discounted price tag (or other written discount) that you found in the real world. They must find an item that is equally (or more) discounted, by percentage, before asking another question.`,
    castingCost: `A photo of a price tag.`,
    notes: `The discount cannot be found online or in a publication; it must be in a store that is selling that item in-person. The discount must be clearly marked as being a discount; it can't just be an item that happens to be cheaper than normal.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'bird-guide',
    name: 'Curse of the Bird Guide',
    expansion: 'base',
    description: `You have one chance to film a bird for as long as possible, up to [S5, M10, L15] minutes straight. If, at any point, the bird leaves the frame, your timer is stopped. The seekers must then film a bird for the same amount of time or longer before asking another question.`,
    castingCost: `Film a bird.`,
    notes: `The bird must be in frame from the moment the video starts. It is considered "in frame" so long as there is any recognizable portion of the bird on camera. The seekers have unlimited attempts to accomplish this.`,
    clear: 'task',
    blocksQuestions: true,
    benchmark: { label: 'Bird footage', unit: 'minutes' },
  },
  {
    id: 'blind-wanderer',
    name: 'Curse of the Blind Wanderer',
    expansion: 'expansion-1',
    description: `Seekers must ask their next question at least [S1, M3, L10]mi [S2, M5, L15]km from where they are right now.`,
    castingCost: `Seekers must be at least [S2, M6, L20]mi [S4, M12, L30]km from you.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'bridge-troll',
    name: 'Curse of the Bridge Troll',
    expansion: 'base',
    description: `The seekers must ask their next question from under a bridge.`,
    castingCost: `Seekers must be at least [S1, M5, L30]mi [S2, M10, L50]km from you.`,
    notes: `"Bridge" is defined as any elevated structure, acting as a path, road or railway, intended to be crossed by pedestrians, cars, or other vehicles. All seekers must have some part of their body under some part of the bridge when the next question is asked. If there are no bridges on the game map, this curse should be removed from the deck.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'cairn',
    name: 'Curse of the Cairn',
    expansion: 'base',
    description: `You have one attempt to stack as many rocks on top of each other as you can in a freestanding tower. Each rock may only touch one other rock. Once you have added a rock to the tower, it may not be removed. Before adding another rock, the tower must stand for at least five seconds. If at any point, any rock other then the base rock touches the ground, your tower has fallen. Once your tower falls, tell the seekers how many rocks high your tower was when it last stood for five seconds. The seekers must then construct a rock tower of the same number of rocks, under the same parameters, before asking another question. If their tower falls, they must restart. The rocks must be found in nature, and both teams must disperse the rocks after building.`,
    castingCost: `Build a rock tower.`,
    notes: `You cannot begin fulfilling the casting cost of this curse if you would be otherwise unable to play a curse; once the cost is fulfilled, this curse must be cast immediately. "Found in nature," in this context, does not necessarily mean found in a natural space or untouched by humans; it simply means that you must find the rocks yourself, and cannot buy them.`,
    clear: 'task',
    blocksQuestions: true,
    benchmark: { label: 'Tower height', unit: 'rocks' },
  },
  {
    id: 'chasm',
    name: 'Curse of the Chasm',
    expansion: 'expansion-1',
    description: `For the next three questions that the seekers ask, they must roll a die. If they roll a 1, 2, 3, or 4, that question is automatically randomized.`,
    castingCost: `Discard a randomize.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'clone',
    name: 'Curse of the Clone',
    expansion: 'expansion-1',
    description: `Find a stranger in public and note the following things about them: Do they have long sleeves or short sleeves? Do they have long pants/skirt or short pants/skirt? Do they have glasses or no glasses? Do they have a hat or no hat? Do they have a bag or no bag?
The seekers must find a stranger with the same qualities before asking another question.`,
    castingCost: `Find a stranger.`,
    notes: `Long sleeves are defined as sleeves that extend past the elbow, and long pants/skirts are defined as extending past the knee.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'curious-explorer',
    name: 'Curse of the Curious Explorer',
    expansion: 'expansion-1',
    description: `Seekers must spend at least [S10, M20, L30] minutes in a museum before asking another question. If there is an entry fee, they may wait in the lobby or directly outside.`,
    castingCost: `Seekers must be off-transit within 0.5mi (1km) of a museum that is open for at least another hour.`,
    notes: `"Museum" is anything categorized as a museum by the mapping app you are using. Players may also choose to wait outside if the museum is closed by the time they arrive. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it's stopped to fulfill the condition.)`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'data-leak',
    name: 'Curse of the Data Leak',
    expansion: 'expansion-1',
    description: `For the rest of the run, seekers must tell you their route and destination every time they board any form of transit. They may not disembark at any other destination unless forced to.`,
    castingCost: `Discard [S4, M6, L10] minutes worth of time bonuses.`,
    notes: `"Route" includes start and end destinations and the line of transit (if applicable.) If forced off a route for any reason, the hider must be notified immediately. Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'distant-cuisine',
    name: 'Curse of the Distant Cuisine',
    expansion: 'base',
    description: `Find a restaurant within your zone that explicitly serves food from a specific foreign country. The seekers must visit a restaurant serving food from a country that is an equal or greater distance away before asking another question.`,
    castingCost: `You must be at the restaurant.`,
    notes: `The restaurants used for this curse must explicitly reference a single country or region within a single country in either their name or some other public-facing material such as a menu. If a restaurant associates itself with multiple countries or a region larger than a single country (such as an "Asian" restaurant), it cannot be used for this curse. Distance from a given country is measured from your exact location to the nearest point in that country.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'divine-blessing',
    name: 'Curse of the Divine Blessing',
    expansion: 'expansion-1',
    description: `For the rest of the round, keep all cards drawn. Hand size limit still applies.`,
    castingCost: `Discard 3 curses.`,
    clear: 'round',
    discardCost: 3,
  },
  {
    id: 'drained-brain',
    name: 'Curse of the Drained Brain',
    expansion: 'base',
    description: `Choose three questions in different categories. The seekers cannot ask those questions for the rest of the run.`,
    castingCost: `Discard your hand.`,
    notes: `This curse may be used (and its price paid) during the time interval between a question and its answer, allowing a player to discard their hand before receiving the reward from a given question. You may not, however, ban the question that has just been asked, even if you have not yet answered it. Questions removed from the game using this curse cannot be asked, even for increased cost.`,
    clear: 'round',
    discardCost: 'hand',
  },
  {
    id: 'egg-partner',
    name: 'Curse of the Egg Partner',
    expansion: 'base',
    description: `Seekers must acquire an egg before asking another question. This egg is now treated as an official team member of the seekers. If any team members are abandoned or killed (defined as cracked, in the egg's case) before the end of your run, you are awarded an extra [S30, M45, L60] minutes. This curse cannot be played during the endgame.`,
    castingCost: `Discard two cards.`,
    notes: `The egg can be from any type of animal, but it must be a real egg (a chocolate egg or a plastic egg, for example, would not count.) Any visible fracture, however small, counts as killing the egg. If you do not want to buy items during the course of your game, or object to this curse on ethical grounds, this curse should be removed from the deck. For any other curse that requires all seekers to do something, the egg counts as a seeker. For example, Curse of the Lemon Phylactery after this curse has been played would require the egg to have a lemon attached to it.`,
    clear: 'task',
    blocksQuestions: true,
    discardCost: 2,
  },
  {
    id: 'empty-mind',
    name: 'Curse of the Empty Mind',
    expansion: 'expansion-1',
    description: `Search through the deck and choose any three cards to add to your hand. You must play this curse immediately.`,
    castingCost: `You cannot draw cards for the rest of the round.`,
    notes: `"Immediately" means that this curse never enters your hand; it is played the moment it is chosen. Cards must be chosen before the next question is asked.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'endless-tumble',
    name: 'Curse of the Endless Tumble',
    expansion: 'base',
    description: `Seekers must roll a die at least 100ft (30m) and have it land on a 5 or a 6 before they can ask another question. The die must roll the full distance, unaided, using only the momentum from the initial throw and gravity to travel the 100ft (30m). If the seekers accidentally hit someone with a die you are awarded a [S10, M20, L30] minute bonus.`,
    castingCost: `Roll a die. If it's a 5 or 6, this card has no effect.`,
    notes: `30 meters is measured parallel to the ground. The die can, and likely should, be rolled on an inclined surface. If the die is lost or does not land cleanly on one side, it cannot be counted. Any bonuses awarded to the hider should be delivered immediately.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'express-route',
    name: 'Curse of the Express Route',
    expansion: 'expansion-1',
    description: `Seekers cannot disembark any transit for the next [S10, M20, L30] minutes, unless they've reached the end of a line.`,
    castingCost: `Discard at least [S10, M15, L20] minutes worth of time bonuses.`,
    notes: `Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.`,
    clear: 'timer',
    durationMinutes: [10, 20, 30],
    unsupported: true,
  },
  {
    id: 'featherless-flight',
    name: 'Curse of Featherless Flight',
    expansion: 'expansion-1',
    description: `Construct a paper airplane. You may practice throwing it, but you get one official attempt to measure how far it flies horizontally. The seekers must construct, throw, and retrieve an airplane from at least the same distance before asking another question.`,
    castingCost: `Throw and retrieve a paper airplane.`,
    notes: `A paper airplane may take any form, but must be constructed entirely from paper. The paper airplane may be thrown from a height in order to achieve extra lateral distance.`,
    clear: 'task',
    blocksQuestions: true,
    benchmark: { label: 'Flight distance', unit: 'ft or m' },
  },
  {
    id: 'five-minute-king',
    name: 'Curse of the 5-Minute King',
    expansion: 'expansion-1',
    description: `Remove all 5-minute bonuses from the deck for the rest of your run. After doing so, you must reshuffle the deck.`,
    castingCost: `Discard two 5-minute bonus cards.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'freewheeler',
    name: 'Curse of the Freewheeler',
    expansion: 'expansion-1',
    description: `The next three questions that the seekers ask must be asked while on a moving form of transit.`,
    castingCost: `Seekers must be at least [S2, M5, L50]mi [S4, M8, L80]km from you.`,
    clear: 'round',
  },
  {
    id: 'gamblers-feet',
    name: `Curse of the Gambler's Feet`,
    expansion: 'base',
    description: `For the next [S20, M40, L60] minutes, seekers must roll a die before they take any steps in any direction. They may take that many steps before rolling again.`,
    castingCost: `Roll a die. If it's an even number, this curse has no effect.`,
    notes: `The die rolled for this curse must be a d6. If there are multiple seekers, seekers may choose to roll independently or have one die dictate steps for all seekers at once; either is acceptable. If seekers accidentally take extra steps, they should stop and roll the die retroactively until they have made up for the unaccounted steps. Seekers cannot take unaccounted steps on purpose, except in situations where it would be unsafe to not take extra steps (such as crossing a busy road.)`,
    clear: 'timer',
    durationMinutes: [20, 40, 60],
  },
  {
    id: 'gilded-inquiry',
    name: 'Curse of the Gilded Inquiry',
    expansion: 'expansion-1',
    description: `Secretly choose one question. If the seekers ask that question after this curse is played, the question is automatically vetoed and you instantly draw and keep three extra cards.`,
    castingCost: `The seekers' next question is free.`,
    notes: `"Vetoed" in this case should be treated identically to a veto card being played; the question is not answered, no reward is given, and it is removed from the game for the rest of the round.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'grass-toucher',
    name: 'Curse of the Grass-Toucher',
    expansion: 'expansion-1',
    description: `The next question that the seekers ask must be asked at least 250ft (75m) from any named street (on Google Maps.) As always, no trespassing.`,
    castingCost: `This curse must be cast at least 250ft (75m) from any named street.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'hidden-hangman',
    name: 'Curse of the Hidden Hangman',
    expansion: 'base',
    description: `Before asking another question or boarding another form of transportation, seekers must beat the hider in a game of hangman. To play, the hider chooses a 5 letter word, and the game ends after either a correct word guess or 7 wrong letter guesses (head, body, two arms, two legs, and a hat). The hider must respond to all queries within 30 seconds. The seekers cannot challenge the hider for 10 minutes after a loss. After [S1, M2, L3] losses, the seekers must wait 10 more minutes and then the curse is cleared.`,
    castingCost: `Discard 2 cards.`,
    notes: `The chosen five-letter word must be a real word, found in a dictionary, in the language that the game is being played in. You cannot, for example, use a French word if all players only speak English. If the hider ever fails to respond to a query in 30 seconds, this curse is instantly cleared.`,
    clear: 'task',
    blocksQuestions: true,
    discardCost: 2,
  },
  {
    id: 'hide-and-seek-ception',
    name: 'Curse of the Hide-And-Seek-Ception',
    expansion: 'expansion-1',
    description: `All seekers but one must close their eyes. Without discussion, the remaining seeker must go somewhere at least 1,000ft (300m) away and not within direct eyeshot in any direction. The other seekers must find them, without asking them for any information, before asking another question.`,
    castingCost: `The seekers must be off-transit, at least 1,000ft (300m) from a transit station.`,
    notes: `The hiding seeker may call or text the other seeker(s) when they are in position, but no more communication is allowed. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it's stopped to fulfill the condition.)`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'impenetrable-fog',
    name: 'Curse of the Impenetrable Fog',
    expansion: 'expansion-1',
    description: `For the next hour, any time the seekers reach a street intersection, they must assign each direction to a number on their die. They may assign a direction to multiple numbers, but each direction must be assigned to at least one. Then, they roll the die to see what direction to go.`,
    castingCost: `Roll a die. If it's odd, this curse has no effect.`,
    notes: `"Intersection" here is defined as any point along a named path or street (i.e. has a name on whatever mapping app you choose to use) where the player has an opportunity to turn onto one or more different named paths or streets. If there are somehow more than six divergent paths, a random number generator can be used instead of a die.`,
    clear: 'timer',
    durationMinutes: 60,
  },
  {
    id: 'impressionable-consumer',
    name: 'Curse of the Impressionable Consumer',
    expansion: 'base',
    description: `Seekers must enter and gain admission (if applicable) to a location or buy a product that they saw an advertisement for before asking another question. This advertisement must be found out in the world, and must be at least 100ft (30m) from the product or location itself.`,
    castingCost: `The seekers' next question is free.`,
    notes: `Any object or display whose primary purpose is to raise awareness of a product, service, or business counts as an advertisement. If the advertisement is for a specific service, such as a massage, the seekers must pay for and receive the service advertised. If the advertisement is for a location but not a specific service, such as an amusement park, the seekers must enter that location. Locations that are not private businesses, such as a public park, do not count. If you do not want to be forced to potentially spend money to fulfill this curse, it should be removed from the deck.`,
    clear: 'task',
    blocksQuestions: true,
    unsupported: true,
  },
  {
    id: 'jammed-door',
    name: 'Curse of the Jammed Door',
    expansion: 'base',
    description: `For the next [S0.5, M1, L3] hours, whenever the seekers want to pass through a doorway into a building, business, train, or other vehicle, they must first roll 2 dice. If they do not roll a 7 or higher, they cannot enter that space (including through other doorways.) Any given doorway can be re-attempted after [S5, M10, L15] minutes.`,
    castingCost: `Discard two cards.`,
    notes: `Seekers must roll two d6 dice. Dice can only be rolled to enter a doorway once the doorway is visible to the seekers. For example, if you are attempting to roll to enter a train, you cannot roll the dice before the train arrives; you must be able to see the train door first. Doorways within a building that lead to other parts of the same building, such as a store within a train station, do not need to pass a dice check. If there is any reasonable dispute as to whether something counts as a separate building, err on the side of doing a dice check. If the curse expires while a doorway is on cooldown, that cooldown also immediately expires.`,
    clear: 'timer',
    durationMinutes: [30, 60, 180],
    discardCost: 2,
  },
  {
    id: 'labyrinth',
    name: 'Curse of the Labyrinth',
    expansion: 'base',
    description: `Spend up to [S10, M20, L30] minutes drawing a solvable maze and send a photo of it to the seekers. You cannot use the internet to research maze designs. The seekers must solve the maze before asking another question.`,
    castingCost: `Draw a maze.`,
    notes: `"Solvable," in this context, refers to a conventional solution to the maze -- you must be able to draw an unbroken line from the start of the maze to the end of the maze. Your time limit begins from the moment you draw your first line; time spent gathering materials does not count. You may discard your maze and start drawing a maze at any point, but you cannot restart your timer. You may not consult the internet or any other materials when drawing your maze; it must come entirely from your own head.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'landline',
    name: 'Curse of the Landline',
    expansion: 'expansion-1',
    description: `For the next two hours, seekers may only use their phone for game-related purposes while it is charging via a wall outlet.`,
    castingCost: `Seekers must be at least [S2, M5, L50]mi [S4, M8, L80]km from you.`,
    clear: 'timer',
    durationMinutes: 120,
  },
  {
    id: 'lemon-phylactery',
    name: 'Curse of the Lemon Phylactery',
    expansion: 'base',
    description: `Before asking another question, the seekers must each find a lemon and affix it to their outermost layer of their clothes or skin. If, at any point, one of these lemons is no longer touching a seeker, you are awarded [S30, M45, L60] minutes. This curse cannot be played during the endgame.`,
    castingCost: `Discard a power-up.`,
    notes: `The lemon must be a real lemon. It can be affixed using any means, but must be constantly touching the seeker's skin or clothes. Once the lemon falls, the hider should be informed of their bonus immediately.`,
    clear: 'task',
    blocksQuestions: true,
    unsupported: true,
  },
  {
    id: 'long-shot',
    name: 'Curse of the Long Shot',
    expansion: 'expansion-1',
    description: `Once this curse is cast, the seekers have five minutes to provide one guess as to what transit station you are centered at. If they are correct, you must tell them so. If they are incorrect, they are frozen for [S18, M27, L45] minutes.`,
    castingCost: `Seekers must be within [S2, M5, L50]mi [S3, M8, L80]km of you.`,
    notes: `When seekers are "frozen," they cannot make progress on clearing other curses or take any form of transit. If they are currently on transit when they become frozen, they must disembark at the next opportunity and wait out the rest of their freeze period at that station. Players may walk around freely while frozen for non game-related reasons, but must resume from the place where they were frozen when the freeze period concludes.`,
    clear: 'timer',
    durationMinutes: [18, 27, 45],
  },
  {
    id: 'luxury-car',
    name: 'Curse of the Luxury Car',
    expansion: 'base',
    description: `Take a photo of a car. The seekers must take a photo of a more expensive car before asking another question.`,
    castingCost: `A photo of a car.`,
    notes: `You must be able to identify the car in question when sending the photo, and the seekers must agree that it is, in fact, the car that you claim it is. Use the MSRP of the car, factoring in its year of production, and disregarding any add-ons or modifications that may have been paid for. (For example: upgrades to the car's interior, special tires, custom colors, etc.) The photo sent to the seekers must include enough of the car for it to be identifiable. All of these rules also apply to the car found by the seekers. If you cannot confirm a car's exact production year or exact model, both sides must come to a consensus on which model and year to use for determining price.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'mediocre-travel-agent',
    name: 'Curse of the Mediocre Travel Agent',
    expansion: 'base',
    description: `Choose any publicly-accessible place within [S0.25, M0.25, L0.50]mi [S0.5, M0.5, L1]km of the seekers' current location. They cannot currently be on transit. They must go there, and spend at least [S5, M5, L10] minutes there, before asking another question. They must send you at least three photos of them enjoying their vacation, and procure an object to bring you as a souvenir. If this souvenir is lost before they can give it to you, you are awarded an extra [S30, M45, L60] minutes.`,
    castingCost: `Their vacation destination must be further from you than their current location.`,
    notes: `"Publicly accessible" in this context follows the same rules as "publicly accessible" in the context of hiding spots. The destination does not need to be a single point; it can be a small general area like a park or store. The souvenir can be literally any physical object. It does not need to be with the seekers at all times, but it must be with them at the moment that the hider is caught.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'mind-meld',
    name: 'Curse of the Mind Meld',
    expansion: 'expansion-1',
    description: `On the count of three, any two seekers say any word at the same time. Assuming they're not the same word, they must wait [S1, M3, L5] minutes, and both seekers say a new word that they believe to be the midpoint between the last two words. You may not say any words that have already been said, or do anything at all to indicate what word you will say next.
Seekers may not ask another question until they both say the same word.`,
    castingCost: `Discard a card.`,
    clear: 'task',
    blocksQuestions: true,
    discardCost: 1,
  },
  {
    id: 'non-dominant-hand',
    name: 'Curse of the Non-Dominant Hand',
    expansion: 'expansion-1',
    description: `For the next [S30, M45, L60] minutes, seekers may not use their dominant hand for any game-related task. That includes using their phone, completing a challenge, or writing anything on a map. If you're ambidextrous, choose a hand.`,
    castingCost: `Discard a card.`,
    clear: 'timer',
    durationMinutes: [30, 45, 60],
    discardCost: 1,
  },
  {
    id: 'okaihau-express',
    name: 'Curse of the Okaihau Express',
    expansion: 'expansion-1',
    description: `Seekers must record and send a video of themselves singing the full, memorized lyrics of Okaihau Express by Peter Cape -- without any outside support -- before asking another question. It is up to you, however, to prove if they have made a mistake.`,
    castingCost: `Discard three time bonuses.`,
    notes: `PLACEHOLDER -- the card prints the full lyrics here; paste them in (or a link to them) to replace this line.`,
    clear: 'task',
    blocksQuestions: true,
    unsupported: true,
  },
  {
    id: 'open-mind',
    name: 'Curse of the Open Mind',
    expansion: 'expansion-1',
    description: `You no longer have a hand size limit.`,
    castingCost: `Discard your hand.`,
    clear: 'round',
    discardCost: 'hand',
    unsupported: true,
  },
  {
    id: 'oracle',
    name: 'Curse of the Oracle',
    expansion: 'expansion-1',
    description: `Seekers must flip a coin and predict its outcome while it is in the air. If they are correct, they do it again.
If they are wrong, they must wait [S1, M3, L5] minutes. They may not ask another question until they get it correct three times in a row.`,
    castingCost: `Discard two cards.`,
    clear: 'task',
    blocksQuestions: true,
    discardCost: 2,
  },
  {
    id: 'overflowing-chalice',
    name: 'Curse of the Overflowing Chalice',
    expansion: 'base',
    description: `For the next three questions, you may draw (not keep) an additional card when drawing from the hider deck.`,
    castingCost: `Discard a card.`,
    notes: `Matching questions become draw 4, keep 1. Measuring questions become draw 4, keep 1. Thermometer questions become draw 3, keep 1. Radar questions become draw 3, keep 1. Photo questions become draw 2, keep 1. Tentacle questions become draw 5, keep 2.`,
    clear: 'round',
    discardCost: 1,
    unsupported: true,
  },
  {
    id: 'passenger-princess',
    name: 'Curse of the Passenger Princess',
    expansion: 'expansion-1',
    description: `The hider selects one seeker to be the passenger princess for the next [S30, M45, L60] minutes. The other seeker is the driver.
The passenger princess is not permitted to carry their own belongings, do any research, hold any maps, or discuss the game in any way. They may be involved in clearing curses if instructed to do so.`,
    castingCost: `Discard two cards.`,
    notes: `If there are more than two seekers, there is still only one passenger princess. If there is only one seeker, this card cannot be played. The passenger princess may speak to the other seeker(s) as normal, but must effectively act as though the game does not exist and cannot provide any substantive commentary that could help the other players in any way.`,
    clear: 'timer',
    durationMinutes: [30, 45, 60],
    discardCost: 2,
  },
  {
    id: 'plagued-word',
    name: 'Curse of the Plagued Word',
    expansion: 'expansion-1',
    description: `For the next [S1, M1, L2] hours, asking a question creates a [S0.25, M1, L5]mi [S0.5, M2, L8]km radius where questions cannot be asked until this curse expires.`,
    castingCost: `Seekers must be at least [S1, M3, L25]mi [S2, M6, L40]km from you.`,
    clear: 'timer',
    durationMinutes: [60, 60, 120],
  },
  {
    id: 'planespotter',
    name: 'Curse of the Planespotter',
    expansion: 'expansion-1',
    description: `The seekers must take a photo of an airplane and send it to the hider before asking another question.`,
    castingCost: `Seekers must be within 10mi (15km) of a commercial airport.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'pomologist',
    name: 'Curse of the Pomologist',
    expansion: 'expansion-1',
    description: `Send the seekers a photo of a fruit, along with a link to its corresponding Wikipedia page. They must find the same type of fruit before asking another question.`,
    castingCost: `A photo of a fruit.`,
    notes: `Specificity is defined by the title of the Wikipedia page (e.g. "Golden Delicious" is a variety of apple that has a Wikipedia page, so finding a Golden Delicious apple would require the seekers to do the same. "Summerset" is a variety of apple that does not have a Wikipedia page, so you could send the Wikipedia page for "apple" and the seekers could respond with anything that would fall under the category of "apple.") You cannot create a Wikipedia page.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'pong-champion',
    name: 'Curse of the Pong Champion',
    expansion: 'expansion-1',
    description: `Throw a die into a container (maximum 6in (15cm) in diameter) from any distance you choose. You have three attempts. Seekers must throw a die into a container from the same horizontal distance before asking another question, but must wait [S1, M3, L5] minutes between attempts.`,
    castingCost: `Successfully land the die in three attempts.`,
    notes: `Players may not practice or solicit any external support from people outside the game. The hider attempt follows the same parameters as the seeker attempt. The dice must come to rest in the cup; if they enter but bounce out, they are not scored.`,
    clear: 'task',
    blocksQuestions: true,
    benchmark: { label: 'Throwing distance', unit: 'ft or m' },
  },
  {
    id: 'post-office',
    name: 'Curse of the Post Office',
    expansion: 'expansion-1',
    description: `Seekers must successfully mail a letter with their next question in it to your home address before asking another question.`,
    castingCost: `Seekers must be within 0.5mi (1km) of a post office that is open for the next hour. You must provide them your home address.`,
    notes: `After the letter has been mailed, they may also use any other form of communication to ask you the question.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'prophet',
    name: 'Curse of the Prophet',
    expansion: 'expansion-1',
    description: `Rearrange the top ten cards of the deck in any order you choose.`,
    castingCost: `Discard two cards.`,
    clear: 'round',
    discardCost: 2,
    unsupported: true,
  },
  {
    id: 'prosperous-home',
    name: 'Curse of the Prosperous Home',
    expansion: 'expansion-1',
    description: `Expand the radius of your hiding zone by 50%.`,
    castingCost: `Discard at least [S10, M15, L20] minutes worth of time bonuses.`,
    notes: `Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'queue',
    name: 'Curse of the Queue',
    expansion: 'expansion-1',
    description: `Seekers may not ask another question until they've waited in line for at least five minutes. They may wait in different lines, but they cannot wait in the same line more than once. They may not let people cut in front of them in line, and lines must have at least two people when they enter them.`,
    castingCost: `You must currently be in line somewhere.`,
    notes: `Players are considered no longer in line once there are no more people in front of them.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'quill',
    name: 'Curse of the Quill',
    expansion: 'expansion-1',
    description: `Before asking another question, the seekers must spell out the name of the category they intend to use (e.g. PHOTO or MATCHING) by sending photos of handwritten letters they've found in the world. The letters do not all need to be found in the same place, but they must be created by other people and not printed by any kind of machine. They cannot use a letter twice.`,
    castingCost: `Seekers must be at least 500ft (150m) from any transit station.`,
    notes: `The category words are: MATCHING, MEASURING, RADAR, THERMOMETER, PHOTO, TENTACLES. There must be reasonable evidence to suggest that a handwritten letter was written directly on the surface by a person (with a pencil, pen, marker, paintbrush, spray can, chalk, etc.) and not printed.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'ransom-note',
    name: 'Curse of the Ransom Note',
    expansion: 'base',
    description: `The next question that the seekers ask must be composed of words and letters cut out of any printed material. The question must be coherent and include at least 5 words.`,
    castingCost: `Spell out "ransom note" as a ransom note (without using this card).`,
    notes: `You cannot begin fulfilling the casting cost of this curse if you would be otherwise unable to play a curse; once the cost is fulfilled, this curse must be cast immediately. The printed material cannot be printed by the seekers; the letters should be gathered from magazines, newspapers, or any other material that the seekers encounter in the wild. "Coherence" in this context does not necessarily mean complete sentences, but the hider should be able to discern the meaning of the question without further clarification. You may use easy-to-understand abbreviations for certain words (such as a "2" instead of "to.") If the question requires additional context outside of the basic sentence itself, this context does NOT need to be provided in the form of a ransom note. For example, if you are asking a thermometer question, you can simply ask something along the lines of, "Went 10 km. Hotter/colder?" Any information about where you started and ended the thermometer can be provided as normal, in the form of a location pin or text.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'rewind',
    name: 'Curse of the Rewind',
    expansion: 'expansion-1',
    description: `Seekers must ask their next question from the exact place they asked their last question.`,
    castingCost: `The last question must have been asked during the end game.`,
    notes: `It is the responsibility of the hider to keep track of where the last question was asked (and therefore where the seekers must return before asking their next question.)`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'right-turn',
    name: 'Curse of the Right Turn',
    expansion: 'base',
    description: `For the next [S20, M40, L60] minutes the seekers can only turn right at any street intersection. If at any point, they find themselves in a dead end where they cannot continue forward or turn right for another 1,000ft (300m) they may do a full 180. A right turn is defined as a road at any angle that veers to the right of the seekers.`,
    castingCost: `Discard a card.`,
    notes: `This curse only applies to street intersections, meaning the intersection between two roads intended for cars (or the pedestrian sidewalks along those roads.) This curse would not have any effect indoors, or in an area where there are no streets.`,
    clear: 'timer',
    durationMinutes: [20, 40, 60],
    discardCost: 1,
  },
  {
    id: 'runner',
    name: 'Curse of the Runner',
    expansion: 'expansion-1',
    description: `For the next [S30, M45, L60] minutes, the seekers are only allowed to run or be still. They may not walk.`,
    castingCost: `Discard [S4, M6, L10] minutes worth of time bonuses.`,
    notes: `"Running" is defined as a gait that does not have a double-support phase (i.e. both feet cannot be touching the ground at the same time.) If players want to be still and place both feet on the ground simultaneously, they must do so for 5 seconds or longer. Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.`,
    clear: 'timer',
    durationMinutes: [30, 45, 60],
    unsupported: true,
  },
  {
    id: 'seabird',
    name: 'Curse of the Seabird',
    expansion: 'expansion-1',
    description: `Seekers must photograph a bird within 10ft (3m) of a body of water. If, after [S30, M45, L60] minutes, no bird has been photographed, this curse is automatically cleared.`,
    castingCost: `Seekers must be off-transit within 0.5mi (1km) of a natural body of water.`,
    notes: `"Body of water" can be natural or manmade, but must be large enough to be visible on the mapping app you are using. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it's stopped to fulfill the condition.)`,
    clear: 'deadline',
    durationMinutes: [30, 45, 60],
    blocksQuestions: true,
  },
  {
    id: 'seventh-seal',
    name: 'Curse of the Seventh Seal',
    expansion: 'expansion-1',
    description: `Your current hiding time, excluding bonuses, is doubled. All remaining time this run is not doubled.`,
    castingCost: `Discard six curses.`,
    clear: 'round',
    discardCost: 6,
    unsupported: true,
  },
  {
    id: 'shark',
    name: 'Curse of the Shark',
    expansion: 'expansion-1',
    description: `For the next [S30, M45, L60] minutes, the seekers are not allowed to stop walking for any reason.`,
    castingCost: `Discard a power-up.`,
    notes: `Power-ups include veto, randomize, duplicate, discard 1 draw 2, discard 2 draw 3, discard 3 draw 4, expand maximum hand size by 1, and expand maximum hand size by 2.`,
    clear: 'timer',
    durationMinutes: [30, 45, 60],
    unsupported: true,
  },
  {
    id: 'shrewd-critic',
    name: 'Curse of the Shrewd Critic',
    expansion: 'expansion-1',
    description: `Without using the internet, the seekers must find and visit a location (going inside or immediately outside) that has at least a 4.3 star average rating on Google Maps before asking another question. If their guess was wrong, they must wait [S2, M5, L10] minutes before guessing another location. They cannot be on transit when submitting a guess.`,
    castingCost: `Seekers must be currently off-transit within 500ft (150m) of a location that has at least a 4.3 star average rating on Google Maps.`,
    notes: `If the guessed location does not have a Google pin or any reviews, seekers may make another guess immediately. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it's stopped to fulfill the condition.)`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'sniper',
    name: 'Curse of the Sniper',
    expansion: 'expansion-1',
    description: `Send the seekers a photo you've taken of them. Upon receiving this curse, they have 60 seconds to take a photo of you and end your run. If they fail, draw and keep five cards. You no longer have a maximum hand size.`,
    castingCost: `A photo of the seekers.`,
    notes: `All seekers must be visible in the photo provided. The 60 seconds begins from the moment the curse and photo are delivered.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'soothsayer',
    name: 'Curse of the Soothsayer',
    expansion: 'expansion-1',
    description: `For the rest of the round, you may choose to predict the next question after each question is asked. If you are right, you earn triple rewards. If you are wrong, you earn no reward.`,
    castingCost: `Discard a curse.`,
    notes: `"Triple rewards" means that the reward is earned three times in succession, not all at once (i.e. a radar question would have you draw two, keep one, draw two, keep one, draw two, keep one.)`,
    clear: 'round',
    discardCost: 1,
    unsupported: true,
  },
  {
    id: 'spotty-memory',
    name: 'Curse of Spotty Memory',
    expansion: 'base',
    description: `For the rest of the run, one random category of questions will be disabled at all times. After this curse is played, seekers must roll a die to determine the category of questions to be disabled. This category remains disabled until the next question is asked, at which point a die is rolled again to choose a new category. The same category can be disabled multiple times in a row.`,
    castingCost: `Discard a time bonus.`,
    notes: `The seekers should assign die numbers to each category before their first roll. For small-sized games, which only include five categories of questions, a six would result in a reroll.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'strider',
    name: 'Curse of the Strider',
    expansion: 'expansion-1',
    description: `Walk or run any total distance over the course of 30 minutes. The seekers must travel that same distance together, on foot before asking another question (e.g. the hider runs 3 miles, the seekers must each walk/run 3 miles.)`,
    castingCost: `Travel a distance on foot.`,
    clear: 'task',
    blocksQuestions: true,
    benchmark: { label: 'Distance travelled', unit: 'mi or km' },
  },
  {
    id: 'strongman',
    name: 'Curse of the Strongman',
    expansion: 'expansion-1',
    description: `One hider completes as many push-ups as they can over the course of 15 minutes. They may use any standard of push-up (ie. using knees, chest touches ground, chest touches fist, etc.) The seekers must collectively do this many push-ups of the same standard before asking another question.`,
    castingCost: `Do X push-ups.`,
    clear: 'task',
    blocksQuestions: true,
    benchmark: { label: 'Push-ups completed', unit: 'push-ups' },
  },
  {
    id: 'tiny-home',
    name: 'Curse of the Tiny Home',
    expansion: 'expansion-1',
    description: `All time bonus cards held at the end of this round are worth 50% extra.`,
    castingCost: `The radius of your hiding zone is halved. This curse cannot be played during the endgame.`,
    notes: `This curse cannot be played if the hider would be outside their new zone once the curse takes effect; it must be played within a half radius of the station.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'trickster',
    name: 'Curse of the Trickster',
    expansion: 'expansion-1',
    description: `You may lie -- or provide a false photo -- for one of the next three questions that the seekers ask. As always, you must send a photo of this curse when cast.`,
    castingCost: `Discard a curse.`,
    notes: `You are not required to lie after playing this curse; you may choose to answer the next three questions truthfully.`,
    clear: 'round',
    discardCost: 1,
  },
  {
    id: 'unguided-tourist',
    name: 'Curse of the Unguided Tourist',
    expansion: 'base',
    description: `Send the seekers an unzoomed Google Street View image from a street within 500ft (150m) of where they are now. The shot has to be parallel to the horizon and include at least one human-built structure other than a road. Without using the internet for research, they must find what you sent them in real life before they can use transportation or ask another question. They must send a picture to the hiders for verification.`,
    castingCost: `Seekers must be outside.`,
    notes: `The human-built structure in question cannot be any part of a road, including curbs or sidewalks. If you are playing in a country or area with highly limited Google Street View coverage (such as Germany), this curse should be removed from the deck.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'untethered-spirit',
    name: 'Curse of the Untethered Spirit',
    expansion: 'expansion-1',
    description: `You may move freely within your hiding zone during this round's endgame.`,
    castingCost: `The tracker is reversed.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'urban-explorer',
    name: 'Curse of the Urban Explorer',
    expansion: 'base',
    description: `For the rest of the run seekers cannot ask questions when they are on transit or in a train station.`,
    castingCost: `Discard 2 cards.`,
    notes: `Any pending questions that were asked on transit before this curse was played must still be answered. Questions can still be asked outside of transit stations, but seekers cannot be on a platform or in any building associated with the transit station when asking questions.`,
    clear: 'round',
    discardCost: 2,
  },
  {
    id: 'u-turn',
    name: 'Curse of the U-Turn',
    expansion: 'base',
    description: `The seekers must disembark their current mode of transportation at the next station (as long as that station is served by another form of transit in the next [S0.5, M0.5, L1] hours.)`,
    castingCost: `Seekers must be heading the wrong way. (Their next station is further from you then they are.)`,
    notes: `"Next station," in this context, refers to the next station that the seekers' current mode of transit will stop at; if there are stops along the line that their current route will skip, those should be disregarded. If you are not sure whether the seekers are on transit, or whether their route will stop at a particular station, you may ask them for that information. If there is any ambiguity, you should tell them what you believe their next station is when this curse is cast to confirm that you didn't misread your tracker. Even if the seekers' current mode of transit would eventually bring them closer to you, this curse may still be played so long as their next station is further; a line that heads in your direction but temporarily curves away is a particularly advantageous situation for this curse.`,
    clear: 'task',
  },
  {
    id: 'void',
    name: 'Curse of the Void',
    expansion: 'expansion-1',
    description: `For the next three questions that the seekers ask, roll a die. If you roll a 1, 2, 3, or 4, that question is automatically vetoed.`,
    castingCost: `Discard a veto.`,
    clear: 'round',
    unsupported: true,
  },
  {
    id: 'water-weight',
    name: 'Curse of Water Weight',
    expansion: 'base',
    description: `Seekers must acquire and carry at least 2 liters of liquid per seeker for the rest of your run. They cannot ask another question until they have acquired the liquid. The water may be distributed between seekers as they see fit. If the liquid is lost or abandoned at any point after acquisition, the hider is awarded a [S30, M30, L60] minute bonus.`,
    castingCost: `Seekers must be within 1,000ft (300m) of a body of water.`,
    notes: `Any liquid already traveling with the seekers at the time that this curse is played (e.g. water bottles) does not count. The liquid can be in any number of containers, and can be passed back and forth between seekers at any time. The liquid can be set down when the seekers are stationary or on transit, but it is considered "abandoned" once it is no longer within 3 meters of any seeker. The hider must be informed of their bonus immediately. "Body of water" within this context does not necessarily mean natural, but it cannot be a pool and must be large enough to be marked on the map.`,
    clear: 'task',
    blocksQuestions: true,
  },
  {
    id: 'zipped-lip',
    name: 'Curse of the Zipped Lip',
    expansion: 'expansion-1',
    description: `Seekers can only communicate to one another through gestures and closed-mouth non-word sounds for the next [S10, M20, L30] minutes. They can speak to other people, but cannot speak or write any message intended for another seeker.`,
    castingCost: `Discard a power-up.`,
    notes: `Power-ups include veto, randomize, duplicate, discard 1 draw 2, discard 2 draw 3, discard 3 draw 4, expand maximum hand size by 1, and expand maximum hand size by 2.`,
    clear: 'timer',
    durationMinutes: [10, 20, 30],
    unsupported: true,
  },
  {
    id: 'zoologist',
    name: 'Curse of the Zoologist',
    expansion: 'base',
    description: `Take a photo of a wild fish, bird, mammal, reptile, amphibian, or bug. The seekers must take a picture of a wild animal in the same category before asking another question.`,
    castingCost: `A photo of an animal.`,
    notes: `"Bug" in this context refers to any insect, arachnid, diplopoda, chilopoda, or anything else that would be colloquially and commonly referred to as a "bug." "Wild" in this context means undomesticated and not kept in human captivity, including large-scale outdoor instances of captivity, such as farms or sanctuaries. The photo must include enough of the animal that it is recognizable within its category. If there is any dispute as to an animal's classification, defer to Wikipedia. Animals outside of any of these categories (such as crustaceans) cannot be used for this curse.`,
    clear: 'task',
    blocksQuestions: true,
  },
]
