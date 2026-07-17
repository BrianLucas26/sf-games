import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import type { GameTypeRow } from '@/types/database'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; gameTypes: GameTypeRow[] }

export default function Landing() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({
        status: 'error',
        message:
          'Supabase is not configured yet. Copy .env.example to .env.local and fill in your project URL and anon key.',
      })
      return
    }

    let cancelled = false

    supabase
      .from('game_types')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ status: 'error', message: error.message })
          return
        }
        setState({ status: 'ready', gameTypes: data ?? [] })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Games</h1>
      <p className="mt-2 text-gray-400">
        Pick a game, create a lobby, and share the invite code with your teams.
      </p>

      <div className="mt-8">
        {state.status === 'loading' && (
          <p className="text-sm text-gray-500">Loading games…</p>
        )}

        {state.status === 'error' && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-200">
            {state.message}
          </div>
        )}

        {state.status === 'ready' && state.gameTypes.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-800 p-8 text-center text-gray-500">
            No games are live yet — check back soon.
          </div>
        )}

        {state.status === 'ready' && state.gameTypes.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.gameTypes.map((gameType) => (
              <li
                key={gameType.id}
                className="rounded-lg border border-gray-800 p-5 hover:border-gray-700"
              >
                <h2 className="font-semibold">{gameType.name}</h2>
                {gameType.description && (
                  <p className="mt-1 text-sm text-gray-400">
                    {gameType.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
