import type { ComponentType } from 'react'

// Every game (turf war, hide & seek, scavenger hunt, lockout, ...) plugs into
// the shared lobby/routing shell by registering one of these. The core app
// only ever imports the registry, never a specific game's components.
export interface GameModule {
  slug: string
  name: string
  description: string
  /** Rendered inside the lobby while the host configures a new game instance. */
  LobbySettings?: ComponentType<{ gameId: string }>
  /** Rendered once the game has started; the game's main play surface. */
  Board: ComponentType<{ gameId: string }>
  defaultSettings: object
  /**
   * Called when the host clicks "Start" in the lobby. Invokes whatever this
   * game's own start edge function is (e.g. turf-war-start) -- the generic
   * Lobby route never needs to know that function's name.
   */
  startGame?: (gameId: string) => Promise<void>
}
