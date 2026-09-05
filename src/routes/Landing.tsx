import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GAME_TYPE_CONTENT } from '../../content/game-types'
import { buttonClasses } from '@/components/Button'
import { COMING_SOON_SLUGS, sortComingSoonLast } from '@/lib/comingSoon'
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
          'Supabase is not configured yet. Copy .env.example to .env.local and fill in your project URL and publishable key.',
      })
      return
    }

    let cancelled = false

    supabase
      .from('game_types')
      .select('id, slug, is_active, created_at')
      .eq('is_active', true)
      .order('slug')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setState({ status: 'error', message: error.message })
          return
        }
        setState({ status: 'ready', gameTypes: sortComingSoonLast(data ?? []) })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Games</h1>
      <p className="mt-2 text-[15px] text-muted">
        Pick a game, create a lobby, and share the invite code with your teams.
      </p>

      <div className="mt-6 flex gap-3">
        <Link to="/create" className={buttonClasses('primary')}>
          Create a game
        </Link>
        <Link to="/join" className={buttonClasses('secondary')}>
          Join a game
        </Link>
      </div>

      <div className="mt-10">
        {state.status === 'loading' && <p className="text-sm text-faint">Loading games…</p>}

        {state.status === 'error' && (
          <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4 text-sm text-ink/80">
            {state.message}
          </div>
        )}

        {state.status === 'ready' && state.gameTypes.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-faint">
            No games are live yet — check back soon.
          </div>
        )}

        {state.status === 'ready' && state.gameTypes.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.gameTypes.map((gameType) => {
              const content = GAME_TYPE_CONTENT[gameType.slug]
              return (
                <li
                  key={gameType.id}
                  className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-medium text-ink">{content?.name ?? gameType.slug}</h2>
                    {COMING_SOON_SLUGS.has(gameType.slug) && (
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        Coming Soon!
                      </span>
                    )}
                  </div>
                  {content?.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{content.description}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
