import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { createGame } from '@/lib/gameApi'
import { listRegisteredGames } from '@/lib/gameRegistry'
import type { GameTypeRow } from '@/types/database'

export default function CreateGame() {
  const navigate = useNavigate()
  const [gameTypes, setGameTypes] = useState<GameTypeRow[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
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
    if (!selectedSlug || !displayName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const module = listRegisteredGames().find((g) => g.slug === selectedSlug)
      const { game } = await createGame({
        gameTypeSlug: selectedSlug,
        hostDisplayName: displayName.trim(),
        settings: module?.defaultSettings,
      })
      navigate(`/lobby/${game.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Create a game</h1>

      <div className="space-y-2">
        {gameTypes.map((gt) => (
          <button
            key={gt.id}
            onClick={() => setSelectedSlug(gt.slug)}
            className={`block w-full rounded-lg border p-4 text-left ${
              selectedSlug === gt.slug ? 'border-orange-500' : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            <p className="font-semibold">{gt.name}</p>
            {gt.description && <p className="mt-1 text-sm text-gray-400">{gt.description}</p>}
          </button>
        ))}
        {gameTypes.length === 0 && (
          <p className="text-sm text-gray-500">No games are available to create yet.</p>
        )}
      </div>

      <label className="block text-sm">
        Your name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2"
          placeholder="Host"
        />
      </label>

      <button
        onClick={handleCreate}
        disabled={busy || !selectedSlug || !displayName.trim()}
        className="w-full rounded-md bg-orange-600 py-2 font-medium hover:bg-orange-500 disabled:opacity-50"
      >
        {busy ? 'Creating...' : 'Create lobby'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
