import { GAME_TYPE_CONTENT } from '../../../content/game-types'
import { registerGame } from '@/lib/gameRegistry'
import { startLockout } from './api'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_LOCKOUT_SETTINGS } from './types'

registerGame({
  slug: 'lockout',
  ...GAME_TYPE_CONTENT['lockout'],
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_LOCKOUT_SETTINGS,
  startGame: async (gameId) => {
    await startLockout(gameId)
  },
})
