import { GAME_TYPE_CONTENT } from '../../../content/game-types'
import { registerGame } from '@/lib/gameRegistry'
import { startHideAndSeek } from './api'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_HIDE_AND_SEEK_SETTINGS } from './types'

registerGame({
  slug: 'hide-and-seek',
  ...GAME_TYPE_CONTENT['hide-and-seek'],
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_HIDE_AND_SEEK_SETTINGS,
  startGame: async (gameId) => {
    await startHideAndSeek(gameId)
  },
})
