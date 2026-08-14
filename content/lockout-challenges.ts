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
  {
    prompt: 'Photo with a food truck',
    description: 'PLACEHOLDER: Take a photo with a food truck.',
  },
  { prompt: "Name a shop owner's pet" },
  {
    prompt: 'Find a fire hydrant mural',
    description: 'PLACEHOLDER: Find a fire hydrant that has been painted or decorated.',
  },
  {
    prompt: 'Count flags on one block',
    description: 'PLACEHOLDER: Count how many flags are flying on a single block.',
  },
  { prompt: 'Get a business card from a local' },
  {
    prompt: 'Find a hand-me-down bookshelf',
    description: 'PLACEHOLDER: Find a free "take a book" shelf or box.',
  },
  {
    prompt: 'Photo with a food cart',
    description: 'PLACEHOLDER: Take a photo with a street food cart.',
  },
  { prompt: 'Spot a parklet' },
  {
    prompt: 'Find a building older than 1900',
    description: 'PLACEHOLDER: Find a building constructed before 1900.',
  },
  {
    prompt: "Learn a shopkeeper's favorite season",
    description: 'PLACEHOLDER: Ask a shopkeeper their favorite season and why.',
  },
  { prompt: 'Photo next to a fire escape' },
  {
    prompt: 'Find a hidden staircase',
    description: 'PLACEHOLDER: Find a public staircase tucked between buildings.',
  },
  {
    prompt: 'Team photo with a dog',
    description: 'PLACEHOLDER: Take a team photo with a friendly dog (with permission).',
  },
  { prompt: "Note the oldest car parked nearby" },
  {
    prompt: 'Find a chalkboard sign',
    description: 'PLACEHOLDER: Find a business with a handwritten chalkboard sign.',
  },
  {
    prompt: 'Spot a rooftop garden',
    description: 'PLACEHOLDER: Find a visible rooftop garden or greenery.',
  },
  { prompt: 'Photo at a bus stop' },
  {
    prompt: 'Find a community bulletin board',
    description: 'PLACEHOLDER: Find a public bulletin board and note an upcoming event on it.',
  },
  {
    prompt: 'Touch the ocean',
    description: 'Can be any water that is directly connected to the ocean.',
  },
  {
    prompt:'High five at the highest point in the city',
    description: 'High five at the highest point in the city (mt davidson).',
  },
  {
    prompt:'Order at a fast food restaurant',
    description: 'Order at a fast food restaurant.',
  },
  {
    prompt:'Find 10 different tech ads',
    description: 'Find 10 different tech ads in the city.',
  },
  {
    prompt:'Get a photo with both the golden gate and bay bridge in view',
    description: 'Get a photo with both the golden gate and bay bridge in view.',
  },
  {
    prompt:'Earn a dollar busking',
    description: 'Earn a dollar busking, must come from a stranger.',
  },
  {
    prompt:'Skip a rock 3 times',
    description: 'Skip a rock at least 3 times in a single throw.',
  },
  {
    prompt:'Photograph 3 waymos',
    description: 'Photograph 3 waymos in the same picture.',
  },
  {
    prompt:'Film a bird for 5 minutes',
    description: 'Film a bird for 5 minutes without it leaving frame.',
  },
  {
    prompt:'Take every form of public transit in the city',
    description: 'Take every form of public transit in the city (bart, metro, bus, streetcar, cable car).',
  },
  {
    prompt:'Bike the wiggle',
    description: 'Can be any part of the wiggle.',
  },
  {
    prompt:'Spell SF on a strava map',
    description: 'Spell SF on a strava map.',
  },
  {
    prompt:'Find 67',
    description: 'Find 67 written somewhere (not by you).',
  },
  {
    prompt:'Pitch a startup to a stranger',
    description: 'Pitch a startup idea to a stranger and get them to rate it, they must give it a >50% rating.',
  },
  {
    prompt:'Get a stranger\'s phone number',
    description: 'Get a stranger\'s phone number.',
  },
  {
    prompt:'Get 500 feet above sea level',
    description: 'Get 500 feet above sea level.',
  },
  {
    prompt:'Play a sport',
    description: 'Join a pickup game of any sport and score a point.',
  },
  {
    prompt:'Find a full ranbow of colored houses',
    description: 'Find one house for each color of the rainbow (red, orange, yellow, green, blue, indigo, violet).',
  },
  {
    prompt:'Win a prize from a claw machine',
    description: 'Win a prize from a claw machine.',
  },
  {
    prompt:'Find your initials on a sign',
    description: 'Find a sign that contains the letters of every team member\'s initials.',
  },
  {
    prompt:'Get something edible for free',
    description: 'Get a free food item from a public place (Do not steal).',
  },
  {
    prompt:'Find 5 different animals',
    description: 'Take photo of 5 different animals.',
  },
  {
    prompt:'Find a perfect color match of something you have on you',
    description: 'Find a perfect color match of something you have (can\'t be black or white).',
  },
  {
    prompt:'Get wet',
    description: 'One team member must be visibly wet.',
  },
  {
    prompt:'Do 50 burpees',
    description: 'Do 50 burpees, only one team member needs to do it.',
  },
  {
    prompt:'Do a blind taste test',
    description: 'Have one team member correctly guess 3 different flavors of the same food item while blindfolded. (tea, chips, etc.)',
  },
  {
    prompt:'Get to the roof/top of a building',
    description: 'Get to the roof or top of a building.',
  },
  {
    prompt:'Go somewhere from the 1800s',
    description: 'Visit a location that was built or established in the 1800s.',
  },
  {
    prompt:'Build a raft',
    description: 'Construct a raft of at least 3 different materials and make it float for atleast 10 seconds.',
  },
  {
    prompt:'Recreate a painting',
    description: 'Recreate a painting at an SF museum.',
  },
  {
    prompt:'Get legally intoxicated',
    description: 'One team member must get legally intoxicated.',
  },
  {
    prompt:'Get a photo from afar',
    description: 'Get a photo of a team member from over half a mile away.',
  },
  {
    prompt:'Take 5 different MUNI metro lines',
    description: 'You must travel atleast 1 stop on 5 different MUNI metro lines.',
  },
  {
    prompt:'Play a table sport',
    description: 'Play a table sport (ping pong, billiards, etc.).',
  },
  {
    prompt:'Use a public restroom',
    description: 'No picture verification required.',
  },
  {
    prompt:'Find 3 different languages.',
    description: 'Find 3 different languages on signs or storefronts within one block.',
  },
  {
    prompt:'Find a long-standing business',
    description: 'Find a store that\s been open for more than 25 years.',
  },
  {
    prompt:'Use a payphone',
    description: 'Use a payphone or physical landline phone.',
  },
  {
    prompt:'Get a receipt with a total ending in .00',
    description: 'Get a receipt with a total ending in .00.',
  },
  {
    prompt:'Replicate a statue',
    description: 'Replicate a statue or sculpture found in the city.',
  },
  {
    prompt:'Find a book or play written by an author from SF',
    description: 'Find a book or play written by an author from SF.',
  },
  {
    prompt:'Climb 100 stairs',
    description: 'Climb 100 stairs (cannot double-count steps).',
  },
  {
    prompt:'Go down a slide',
    description: 'Go down a slide.',
  },
  {
    prompt:'Resell something to a pawn shop',
    description: 'Sell something to a pawn shop that you got from another pawn shop.',
  },
  {
    prompt:'Find a sea lion',
    description: 'Find a sea lion, real or fake.',
  },
  {
    prompt:'Solve a puzzle in the daily paper',
    description: 'Solve a puzzle in the daily paper.',
  },
  {
    prompt:'Paint your nails',
    description: 'Only one team member required. Only one nail needs to be painted.',
  },
  {
    prompt:'Find a wildflower native to SF',
    description: 'Find a wildflower that is native to San Francisco.',
  },
  {
    prompt:'Get a library card',
    description: 'Get a library card from the SF public library.',
  },
  {
    prompt:'Take a twins photo',
    description: 'Take a photo of two team members dressed identically.',
  },
  {
    prompt:'Bowl a strike',
    description: 'Bowl a strike using anything as your ball and anything as your pins. Must have 10 pins.',
  },
  {
    prompt:'Find a plaque or marker of a historical event',
    description: 'Find a plaque or marker that commemorates a historical event.',
  },
  {
    prompt:'Find a non-tech billboard',
    description: 'Find a billboard that is not tech related.',
  },
  {
    prompt:'Find a for rent sign',
    description: 'Find a for rent sign.',
  },
  {
    prompt:'Play an instrument',
    description: 'Learn and play a song on any instrument that\s not your voice. Must be a non-original song.',
  },
  {
    prompt:'Touch grass',
    description: 'Just do it.',
  },
  {
    prompt:'Find a mural with a person on it',
    description: 'Find a mural that has a person depicted in it.',
  },
  {
    prompt:'Eat a fortune cookie',
    description: 'Eat a fortune cookie and read the fortune.',
  },
  {
    prompt:'Go to a verifiably haunted place',
    description: 'Visit a location that is known to be haunted. You must find some evidence online that it is haunted.',
  },
  {
    prompt:'Visit the cable car museum',
    description: 'Visit the cable car museum.',
  },
  {
    prompt:'Find a for sale sign',
    description: 'Find a for sale sign.',
  },
  {
    prompt:'Attend an open house',
    description: 'Attend an open house for a property for sale/rent.',
  },
  {
    prompt:'Ring a bell',
    description: 'Can be any physical bell, but must be audible.',
  },
  {
    prompt:'Find a flag of a country from 6 different continents',
    description: 'Find a flag of a country from each of the 6 different continents. (North America, South America, Europe, Asia, Africa, Australia).',
  },
  {
    prompt:'Find a vinyl record or CD of an artist from SF',
    description: 'Find a vinyl record or CD of an artist who is from or based in San Francisco.',
  },
  {
    prompt:'Touch a national landmark',
    description: 'Touch a landmark in the US National Register of Historic PLaces. https://en.wikipedia.org/wiki/List_of_San_Francisco_Designated_Landmarks#Color_markings_%28highest_noted_listing%29',
  },
  {
    prompt:'Find a fire',
    description: 'Can be any flame, but must be real.',
  },
  {
    prompt:'Guess the price of an item',
    description: 'Have one team member select an item from a store and another member must guess the price within 10%. If you fail, you must wait 5 minutes before trying again with a new item.',
  },
  {
    prompt:'Attend a yard sale',
    description: 'Go to any yard sale, garage sale, estate sale, or similar event.',
  },
  {
    prompt:'Get a fruit from a farmer\'s market',
    description: 'Get a fruit from a farmer\'s market.',
  },
  {
    prompt:'Surround a body of water',
    description: 'Complete a full circle around a body of water (lake, pond, etc.).',
  },
  {
    prompt:'Find star wars memorabilia',
    description: 'Find any item related to Star Wars (e.g., toy, poster, clothing).',
  },
  {
    prompt:'Find an I <3 SF',
    description: 'Find any depiction of the I <3 SF logo.',
  },
  {
    prompt:'Guess the number of tapioca pearls in a boba',
    description: 'Guess how many tapioca pearls are in a boba drink. You must be within 10% of the actual number.',
  },
  {
    prompt:'Meet a tourist from Europe',
    description: 'France is the furthest country from SF. Meet a tourist from anywhere in Europe.',
  }
]
