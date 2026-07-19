import { GAME_TYPE_CONTENT } from '../../../content/game-types'
import { registerGame } from '@/lib/gameRegistry'
import { startTurfWar } from './api'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_TURF_WAR_SETTINGS } from './types'

registerGame({
  slug: 'turf-war',
  ...GAME_TYPE_CONTENT['turf-war'],
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_TURF_WAR_SETTINGS,
  startGame: async (gameId) => {
    await startTurfWar(gameId)
  },
})
