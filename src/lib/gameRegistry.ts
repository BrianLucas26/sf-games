import type { GameModule } from '@/types/game'

const registry = new Map<string, GameModule>()

export function registerGame(module: GameModule) {
  registry.set(module.slug, module)
}

export function getGameModule(slug: string): GameModule | undefined {
  return registry.get(slug)
}

export function listRegisteredGames(): GameModule[] {
  return Array.from(registry.values())
}

// Individual games import themselves here once they exist, e.g.:
//   import '@/routes/games/turf-war/register'
// The landing page lists what's active in the database, independent of what's
// implemented here, so a game can be seeded before its UI is ready.
