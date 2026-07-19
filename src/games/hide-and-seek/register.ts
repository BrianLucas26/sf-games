import { GAME_TYPE_CONTENT } from '../../../content/game-types'
import { registerGame } from '@/lib/gameRegistry'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_HIDE_AND_SEEK_SETTINGS } from './types'

// No startGame yet -- there's no hide-and-seek-start edge function to call.
// Also gated out of creation entirely via COMING_SOON_SLUGS
// (src/lib/comingSoon.ts) until the real mechanics land.
registerGame({
  slug: 'hide-and-seek',
  ...GAME_TYPE_CONTENT['hide-and-seek'],
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_HIDE_AND_SEEK_SETTINGS,
})
