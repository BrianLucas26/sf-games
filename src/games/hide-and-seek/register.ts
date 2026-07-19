import { registerGame } from '@/lib/gameRegistry'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_HIDE_AND_SEEK_SETTINGS } from './types'

// No startGame yet -- there's no hide-and-seek-start edge function to call.
// Also gated out of creation entirely via COMING_SOON_SLUGS
// (src/lib/comingSoon.ts) until the real mechanics land.
registerGame({
  slug: 'hide-and-seek',
  name: 'Hide and Seek',
  description: 'One team hides across the city while the other searches for them.',
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_HIDE_AND_SEEK_SETTINGS,
})
