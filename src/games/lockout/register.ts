import { registerGame } from '@/lib/gameRegistry'
import { startLockout } from './api'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_LOCKOUT_SETTINGS } from './types'

registerGame({
  slug: 'lockout',
  name: 'Lockout',
  description:
    'Two teams race to complete challenges on a shared board -- first to a bingo or a majority wins.',
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_LOCKOUT_SETTINGS,
  startGame: async (gameId) => {
    await startLockout(gameId)
  },
})
