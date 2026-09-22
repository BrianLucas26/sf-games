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
  // 1
  {
    prompt: 'Touch the ocean',
    description: 'Touch the ocean or any water that is directly connected to the ocean.',
  },
  // 2
  {
    prompt:'High five at the highest point in the city',
    description: 'High five at the highest point in the city (mt davidson).',
  },
  // 3
  {
    prompt:'Order at a fast food restaurant',
    description: 'Order at a fast food restaurant.',
  },
  // 4
  {
    prompt:'Find 10 different tech ads',
    description: 'Find 10 different tech ads in the city.',
  },
  // 5
  {
    prompt:'Get a photo of both bridges',
    description: 'Get a photo of both the golden gate and the bay bridge.',
  },
  // 6
  {
    prompt:'Earn a dollar busking',
    description: 'Earn a dollar busking, must come from a stranger.',
  },
  // 7
  {
    prompt:'Skip a rock 3 times',
    description: 'Skip a rock at least 3 times in a single throw.',
  },
  // 8
  {
    prompt:'Photograph 3 waymos in one picture',
    description: 'Photograph 3 waymos in the same picture.',
  },
  // 9
  {
    prompt:'Film a bird for 5 minutes',
    description: 'Film a bird for 5 minutes without it leaving frame. If it leaves frame, you must start over.',
  },
  // 10
  {
    prompt:'Take every form of MUNI',
    description: 'Take every form of MUNI in the city (metro, bus, streetcar, cable car).',
  },
  // 11
  {
    prompt:'Bike the wiggle',
    description: 'Must start/end at the panhandle and market st, in either direction.',
  },
  // 12
  {
    prompt:'Spell SF on a strava map',
    description: 'Spell SF on a strava map.',
  },
  // 13
  {
    prompt:'Find 67',
    description: 'Find 67 written somewhere (not by you).',
  },
  // 14
  {
    prompt:'Pitch a startup to a stranger',
    description: 'Pitch a startup idea to a stranger and ask them if it\'s a good idea, they must say yes.',
  },
  // 15
  {
    prompt:'Get a stranger\'s phone number',
    description: 'Get a stranger\'s phone number.',
  },
  // 16
  {
    prompt:'Get 500 feet above sea level',
    description: 'Get 500 feet above sea level.',
  },
  // 17
  {
    prompt:'Play a pickup game',
    description: 'Join a pickup game of any sport and score a point.',
  },
  // 18
  {
    prompt:'Find a full ranbow of colored houses',
    description: 'Find one house for each color of the rainbow (red, orange, yellow, green, blue, purple). The houses don\'t have to be next to each other. The entire house does not need to be that color, but it must be a primary feature of the house.',
  },
  // 19
  {
    prompt:'Win a prize from a claw machine',
    description: 'Win a prize from a claw machine.',
  },
  // 20
  {
    prompt:'Find your initials on a sign',
    description: 'Find a sign that contains the letters of every team member\'s initials.',
  },
  // 21
  {
    prompt:'Get something edible for free',
    description: 'Get a free food item from a public place (Do not steal).',
  },
  // 22
  {
    prompt:'Find 5 different animals',
    description: 'Take photo of 5 different animals. They must be real, living animals.',
  },
  // 23
  {
    prompt:'Find a perfect color match of something you have on you',
    description: 'Find a perfect color match of something you have (can\'t be black, white, or gray).',
  },
  // 24
  {
    prompt:'Get wet',
    description: 'One team member must be visibly wet.',
  },
  // 25
  {
    prompt:'Do 100 burpees',
    description: 'Do 100 burpees. All team members may contribute, but cannot be done concurrently.',
  },
  // 26
  {
    prompt:'Do a blind taste test',
    description: 'Have one team member correctly guess 3 different flavors of gummies while blindfolded.',
  },
  // 27
  {
    prompt:'Get to the roof/top of a building',
    description: 'Get to the roof or top of a building.',
  },
  // 28
  {
    prompt:'Go somewhere from the 1800s',
    description: 'Visit a location that was built or established in the 1800s.',
  },
  // 29
  {
    prompt:'Build a raft',
    description: 'Construct a raft of at least 3 different materials and make it float for at least 10 seconds.',
  },
  // 30
  {
    prompt:'Recreate a painting',
    description: 'Recreate a painting at an SF museum using any materials you find.',
  },
  // 31
  {
    prompt:'Get legally intoxicated',
    description: 'One team member must get legally intoxicated. Follow this chart: https://angelaolsonlaw.com/wp-content/uploads/2014/01/08_BAC_Chart.pdf',
  },
  // 32
  {
    prompt:'Get a photo from afar',
    description: 'Get a photo of a team member from over half a mile away.',
  },
  // 33
  {
    prompt:'Take 5 different MUNI metro lines',
    description: 'You must travel at least 1 stop on 5 different MUNI metro lines.',
  },
  // 34
  {
    prompt:'Play a table sport',
    description: 'Play a table sport (ping pong, billiards, etc.).',
  },
  // 35
  {
    prompt:'Use a public restroom',
    description: 'No picture verification required.',
  },
  // 36
  {
    prompt:'Find 3 different languages.',
    description: 'Find 3 different languages on signs or storefronts within one block.',
  },
  // 37
  {
    prompt:'Find a long-standing business',
    description: 'Find a store that\'s been open for more than 30 years.',
  },
  // 38
  {
    prompt:'Use a payphone',
    description: 'Use a payphone or physical landline phone.',
  },
  // 39
  {
    prompt:'Get a receipt with a total ending in .00',
    description: 'Get a receipt with a total ending in .00.',
  },
  // 40
  {
    prompt:'Replicate a statue',
    description: 'Replicate a statue or sculpture found in the city.',
  },
  // 41
  {
    prompt:'Find a book or play written by an author from SF',
    description: 'Find a book or play written by an author from SF.',
  },
  // 42
  {
    prompt:'Climb 100 stairs',
    description: 'Climb 100 different stairs (cannot double-count steps).',
  },
  // 43
  {
    prompt:'Go down a slide',
    description: 'Go down a slide.',
  },
  // 44
  {
    prompt:'Resell something to a pawn shop',
    description: 'Sell something to a pawn shop that you got from another pawn shop.',
  },
  // 45
  {
    prompt:'Find a sea lion',
    description: 'Find a sea lion, real or fake.',
  },
  // 46
  {
    prompt:'Solve a puzzle in the daily paper',
    description: 'Solve a puzzle in the daily paper.',
  },
  // 47
  {
    prompt:'Paint your nails',
    description: 'Every team member must have at least one matching nail.',
  },
  // 48
  {
    prompt:'Find a wildflower native to SF',
    description: 'Find a wildflower that is native to San Francisco.',
  },
  // 49
  {
    prompt:'Get a library card',
    description: 'Get a library card from the SF public library.',
  },
  // 50
  {
    prompt:'Recreate your outfit',
    description: 'Recreate a player\'s outfit with articles of clothing you find. Must be real clothes.',
  },
  // 51
  {
    prompt:'Bowl a strike',
    description: 'Bowl a strike using anything as your ball and anything as your pins. Must have 10 pins.',
  },
  // 52
  {
    prompt:'Find a plaque or marker of a historical event',
    description: 'Find a plaque or marker that commemorates a historical event.',
  },
  // 53
  {
    prompt:'Find a non-tech billboard',
    description: 'Find a billboard that is not tech related.',
  },
  // 54
  {
    prompt:'Find a for rent sign',
    description: 'Find a for rent sign.',
  },
  // 55
  {
    prompt:'Play an instrument',
    description: 'Learn and play a song on any instrument that\'s not your voice. Must be a non-original song.',
  },
  // 56
  {
    prompt:'Touch grass',
    description: 'Real grass only.',
  },
  // 57
  {
    prompt:'Find a mural with a person on it',
    description: 'Find a mural that has a person depicted in it.',
  },
  // 58
  {
    prompt:'Eat a fortune cookie',
    description: 'Eat a fortune cookie.',
  },
  // 59
  {
    prompt:'Go to a verifiably haunted place',
    description: 'Visit a location that is known to be haunted. You must find some evidence online that it is haunted.',
  },
  // 60
  {
    prompt:'Visit the cable car museum',
    description: 'Visit the cable car museum.',
  },
  // 61
  {
    prompt:'Find a for sale sign',
    description: 'Find a for sale sign.',
  },
  // 62
  {
    prompt:'Attend an open house',
    description: 'Attend an open house for a property for sale/rent.',
  },
  // 63
  {
    prompt:'Ring a bell',
    description: 'Can be any physical bell, but must be audible.',
  },
  // 64
  {
    prompt:'Find a flag of a country from 6 different continents',
    description: 'Find a flag of a country from each of the 6 different continents. (North America, South America, Europe, Asia, Africa, Australia).',
  },
  // 65
  {
    prompt:'Find a vinyl record or CD of an artist from SF',
    description: 'Find a vinyl record or CD of an artist who is from or based in San Francisco.',
  },
  // 66
  {
    prompt:'Play hide and seek at a national landmark',
    description: 'Play hide and seek at a landmark in the US National Register of Historic Places. One team member must generate a random number 2-5 and hides somewhere they think it will take that amount of time for the others to find them. You have a 1 minute buffer on each side. Must regenerate the number on each attempt. https://en.wikipedia.org/wiki/List_of_San_Francisco_Designated_Landmarks#Color_markings_%28highest_noted_listing%29',
  },
  // 67
  {
    prompt:'Find a fire',
    description: 'Can be any flame, but must be real.',
  },
  // 68
  {
    prompt:'Guess the price of an item',
    description: 'Have one team member select an item from a store and another member must guess the price within 10%. If you fail, you must wait 5 minutes before trying again with a new item.',
  },
  // 69
  {
    prompt:'Attend a yard sale',
    description: 'Go to any yard sale, garage sale, estate sale, or similar event.',
  },
  // 70
  {
    prompt:'Get a fruit from a farmer\'s market',
    description: 'Get a fruit from a farmer\'s market.',
  },
  // 71
  {
    prompt:'Surround a body of water',
    description: 'Complete a full circle around a body of water (lake, pond, etc.).',
  },
  // 72
  {
    prompt:'Find star wars memorabilia',
    description: 'Find any item related to Star Wars (e.g., toy, poster, clothing).',
  },
  // 73
  {
    prompt:'Find an I <3 SF',
    description: 'Find any depiction of the I <3 SF logo.',
  },
  // 74
  {
    prompt:'Guess the number of tapioca pearls in a boba',
    description: 'Guess how many tapioca pearls are in a boba drink. You must be within 10% of the actual number.',
  },
  // 75
  {
    prompt:'Meet a tourist from Europe',
    description: 'France is the furthest country from SF. Meet a tourist from anywhere in Europe.',
  },
  // 76
  {
    prompt:'Order from a food truck',
    description: 'Get any item from a food truck.',
  },
  // 77
  {
    prompt:'Find an event happening today',
    description: 'Find a sign or flyer for an event happening today.',
  },
  // 78
  {
    prompt:'Go to 10 different thrift stores',
    description: 'Go to 10 different thrift stores.',
  },
  // 79
  {
    prompt:'Find a Cherry-headed Conure',
    description: 'Photograph a cherry-headed conure, the famous parrots of SF.',
  },
  // 80
  {
    prompt:'Find a tesla with an anti-elon musk sticker',
    description: 'Find a tesla with any anti-elon musk marking.',
  },
  // 81
  {
    prompt:'Take a selfie with someone wearing startup swag',
    description: 'Take a selfie with a stranger wearing startup swag.',
  },
  // 82
  {
    prompt:'Land a bottle flip',
    description: 'Land a bottle flip. You may not practice. If you fail, you must wait 5 minutes between attempts.',
  },
  // 83
  {
    prompt:'Find a line with more than 10 people',
    description: 'Find a line with more than 10 people waiting and wait in it. It cannot be for public transit.',
  },
  // 84
  {
    prompt:'Go to a sports stadium',
    description: 'Go to a sports stadium. Must have a field/court for a specific sport and built-in seating.',
  },
  // 85
  {
    prompt:'Use the force at the Yoda fountain',
    description: 'Knock a fruit off a teammate\'s head from 15 feet away. Must wait 2 minutes between attempts.',
  },
  // 86
  {
    prompt:'Create a rival museum',
    description: 'Create a collection of at least 3 items/exhibits and set them it up in a 5x5ft square outside of a real museum. Without prompting them or interacting with them, you must get 5 strangers to "visit" your museum for at least 10 seconds.',
  },
  // 87
  {
    prompt:'Find a broken clock',
    description: 'Find any clock that has the wrong time. It cannot be owned by your team.',
  },
  // 88
  {
    prompt:'Pet 10 dogs',
    description: 'Pet 10 different dogs.',
  },
  // 89
  {
    prompt:'Roll an object 100 feet',
    description: 'Roll any object at least 100 feet in a single throw.',
  },
  // 90
  {
    prompt:'Relocate water',
    description: 'Move water from the ocean to the bay or from the bay to the ocean. Use the golden gate bridge as the divider between the two.',
  },
  // 91
  {
    prompt:'Go through a tunnel',
    description: 'Must fully complete the tunnel through both ends.',
  },
  // 92
  {
    prompt:'Go over a bridge',
    description: 'Must actually be a bridge that spans a road or body of water.',
  },
  // 93
  {
    prompt:'Get a photo of a boat',
    description: 'Must be a real boat, not a model or toy.',
  },
  // 94
  {
    prompt:'Find two people wearing the same outfit',
    description: 'Find two strangers (not in your team) wearing the same outfit.',
  },
  // 95
  {
    prompt:'Fly a paper airplane 35 feet',
    description: 'Fly a paper airplane at least 35 feet. You may not practice. If you fail, you must wait 5 minutes between attempts.',
  },
  // 96
  {
    prompt:'Start a flash mob',
    description: 'You must get at least one stranger to dance with you for at least 10 seconds.',
  },
  // 97
  {
    prompt:'Find 5 purple items at IKEA',
    description: 'Find 5 different purple items at IKEA.',
  },
  // 98
  {
    prompt:'Take a photo of the other team',
    description: 'Take a photo of the other team without them noticing. This must be done during the game, not during the veto period or before. They must not know you took the photo for this to count.',
  }
]
