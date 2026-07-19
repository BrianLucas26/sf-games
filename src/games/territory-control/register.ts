import { registerGame } from '@/lib/gameRegistry'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_TERRITORY_CONTROL_SETTINGS } from './types'

// No startGame yet -- there's no territory-control-start edge function to
// call. Also gated out of creation entirely via COMING_SOON_SLUGS
// (src/lib/comingSoon.ts) until the real mechanics land.
registerGame({
  slug: 'territory-control',
  name: 'Territory Control',
  description: 'Complete challenges to claim SF districts -- most districts controlled by the end wins.',
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_TERRITORY_CONTROL_SETTINGS,
})
