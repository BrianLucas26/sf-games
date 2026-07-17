import { registerGame } from '@/lib/gameRegistry'
import { startTurfWar } from './api'
import { Board } from './Board'
import { LobbySettings } from './LobbySettings'
import { DEFAULT_TURF_WAR_SETTINGS } from './types'

registerGame({
  slug: 'turf-war',
  name: 'Turf War',
  description:
    'Two teams race to claim SF neighborhoods and hold the largest connected territory by the end of the round.',
  LobbySettings,
  Board,
  defaultSettings: DEFAULT_TURF_WAR_SETTINGS,
  startGame: async (gameId) => {
    await startTurfWar(gameId)
  },
})
