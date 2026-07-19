import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, TextInput } from '@/components/Field'
import { Turnstile } from '@/components/Turnstile'
import { joinGame } from '@/lib/gameApi'

export default function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [joinCode, setJoinCode] = useState(searchParams.get('code')?.toUpperCase() ?? '')
  const [displayName, setDisplayName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!joinCode.trim() || !displayName.trim() || !turnstileToken) return
    setBusy(true)
    setError(null)
    try {
      const { game } = await joinGame({
        joinCode: joinCode.trim(),
        displayName: displayName.trim(),
        turnstileToken,
      })
      navigate(`/lobby/${game.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Join a game</h1>

      <Field label="Join code">
        <TextInput
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="tracking-[0.2em] uppercase"
          placeholder="ABC123"
        />
      </Field>

      <Field label="Your name">
        <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Player" />
      </Field>

      <Turnstile onToken={setTurnstileToken} />

      <Button
        onClick={handleJoin}
        disabled={busy || !joinCode.trim() || !displayName.trim() || !turnstileToken}
        className="w-full"
      >
        {busy ? 'Joining…' : 'Join lobby'}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
