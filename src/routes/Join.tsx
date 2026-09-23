import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, TextInput } from '@/components/Field'
import { Turnstile } from '@/components/Turnstile'
import { supabase } from '@/lib/supabaseClient'
import { joinGame } from '@/lib/gameApi'

// A game already in progress (or finished) has no lobby left to join -- but
// `games` is public-read (see RLS in 0001_init.sql), so anyone with the link
// can still be routed straight to the board as a read-only spectator instead
// of getting stuck on a "this game has already started" error. Spectators
// aren't tracked anywhere (no players row, no auth requirement) -- they just
// read the same publicly-selectable game/team/score data a real player does.
async function resolveJoinCode(code: string) {
  const { data, error } = await supabase
    .from('games')
    .select('id, status')
    .eq('join_code', code.toUpperCase())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export default function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const codeParam = searchParams.get('code')
  const [joinCode, setJoinCode] = useState(codeParam?.toUpperCase() ?? '')
  const [displayName, setDisplayName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Following an invite link after the game has already started should land
  // a spectator on the board with no extra click -- peek at the game's
  // status as soon as the code is known and skip the join form entirely.
  useEffect(() => {
    if (!codeParam) return
    resolveJoinCode(codeParam)
      .then((game) => {
        if (game && (game.status === 'active' || game.status === 'completed')) {
          navigate(`/play/${game.id}`, { replace: true })
        }
      })
      .catch(() => {
        // Swallow -- the normal join form below still handles a bad/expired
        // code once the player actually submits it.
      })
  }, [codeParam, navigate])

  async function handleJoin() {
    if (!joinCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      const game = await resolveJoinCode(joinCode.trim())
      if (!game) throw new Error('No game found for that join code.')
      if (game.status === 'cancelled') throw new Error('This game was cancelled.')

      if (game.status === 'active' || game.status === 'completed') {
        navigate(`/play/${game.id}`)
        return
      }

      if (!displayName.trim()) throw new Error('Enter your name to join.')
      if (!turnstileToken) throw new Error('Complete the verification check.')
      const { game: joinedGame } = await joinGame({
        joinCode: joinCode.trim(),
        displayName: displayName.trim(),
        turnstileToken,
      })
      navigate(`/lobby/${joinedGame.id}`)
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

      <Button onClick={handleJoin} disabled={busy || !joinCode.trim()} className="w-full">
        {busy ? 'Joining…' : 'Join lobby'}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
