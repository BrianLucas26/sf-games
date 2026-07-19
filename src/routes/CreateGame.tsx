import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, TextInput } from '@/components/Field'
import { Turnstile } from '@/components/Turnstile'
import { COMING_SOON_SLUGS } from '@/lib/comingSoon'
import { supabase } from '@/lib/supabaseClient'
import { createGame } from '@/lib/gameApi'
import { listRegisteredGames } from '@/lib/gameRegistry'
import type { GameTypeRow } from '@/types/database'

export default function CreateGame() {
  const navigate = useNavigate()
  const [gameTypes, setGameTypes] = useState<GameTypeRow[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('game_types')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (!data) return
        // Only offer games this build actually has a registered module for.
        const registered = new Set(listRegisteredGames().map((g) => g.slug))
        setGameTypes(data.filter((gt) => registered.has(gt.slug)))
      })
  }, [])

  async function handleCreate() {
    if (!selectedSlug || !displayName.trim() || !turnstileToken) return
    setBusy(true)
    setError(null)
    try {
      const module = listRegisteredGames().find((g) => g.slug === selectedSlug)
      const { game } = await createGame({
        gameTypeSlug: selectedSlug,
        hostDisplayName: displayName.trim(),
        settings: module?.defaultSettings,
        turnstileToken,
      })
      navigate(`/lobby/${game.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md space-y-7">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Create a game</h1>

      <div className="space-y-2">
        {gameTypes.map((gt) => {
          const comingSoon = COMING_SOON_SLUGS.has(gt.slug)
          return (
            <button
              key={gt.id}
              onClick={() => setSelectedSlug(gt.slug)}
              disabled={comingSoon}
              className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                comingSoon
                  ? 'cursor-not-allowed border-border bg-surface opacity-60'
                  : selectedSlug === gt.slug
                    ? 'border-accent bg-accent/[0.06]'
                    : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="font-display font-medium text-ink">{gt.name}</p>
                {comingSoon && (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                    Coming Soon!
                  </span>
                )}
              </div>
              {gt.description && <p className="mt-1 text-sm text-muted">{gt.description}</p>}
            </button>
          )
        })}
        {gameTypes.length === 0 && (
          <p className="text-sm text-faint">No games are available to create yet.</p>
        )}
      </div>

      <Field label="Your name">
        <TextInput
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Host"
        />
      </Field>

      <Turnstile onToken={setTurnstileToken} />

      <Button
        onClick={handleCreate}
        disabled={busy || !selectedSlug || !displayName.trim() || !turnstileToken}
        className="w-full"
      >
        {busy ? 'Creating…' : 'Create lobby'}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
