import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { joinGame } from '@/lib/gameApi'

export default function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [joinCode, setJoinCode] = useState(searchParams.get('code')?.toUpperCase() ?? '')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!joinCode.trim() || !displayName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { game } = await joinGame({ joinCode: joinCode.trim(), displayName: displayName.trim() })
      navigate(`/lobby/${game.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Join a game</h1>
      <label className="block text-sm">
        Join code
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 uppercase tracking-widest"
          placeholder="ABC123"
        />
      </label>
      <label className="block text-sm">
        Your name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2"
        />
      </label>
      <button
        onClick={handleJoin}
        disabled={busy || !joinCode.trim() || !displayName.trim()}
        className="w-full rounded-md bg-orange-600 py-2 font-medium hover:bg-orange-500 disabled:opacity-50"
      >
        {busy ? 'Joining...' : 'Join lobby'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
