import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import { getGameModule } from '@/lib/gameRegistry'
import { cancelGame, selectTeam } from '@/lib/gameApi'
import type { GameRow, PlayerRow, TeamRow } from '@/types/database'

interface GameWithType extends GameRow {
  game_types: { slug: string; name: string }
}

export default function Lobby() {
  const { gameId = '' } = useParams()
  const navigate = useNavigate()
  const { player } = useCurrentPlayer(gameId)
  const [game, setGame] = useState<GameWithType | null>(null)
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    supabase
      .from('games')
      .select('*, game_types(slug, name)')
      .eq('id', gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          // The host cancelled it (or the join code never resolved to a
          // real game) -- nothing left to show, so leave the lobby.
          navigate('/', { replace: true })
          return
        }
        setGame(data as unknown as GameWithType)
      })
    supabase
      .from('teams')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at')
      .then(({ data }) => data && setTeams(data))
    supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at')
      .then(({ data }) => data && setPlayers(data))
  }, [gameId, navigate])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, load)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        load,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, load])

  useEffect(() => {
    if (game?.status === 'active') navigate(`/play/${gameId}`)
  }, [game?.status, gameId, navigate])

  if (!game) return <p className="text-sm text-gray-500">Loading lobby...</p>

  const module = getGameModule(game.game_types.slug)
  const isHost = player?.is_host ?? false
  const inviteLink = `${window.location.origin}/join?code=${game.join_code}`

  async function handleSelectTeam(teamId: string) {
    setError(null)
    try {
      await selectTeam({ gameId, teamId })
      // Don't rely solely on realtime for the actor's own action -- a
      // postgres_changes subscription can miss an update that lands before
      // the channel finishes establishing.
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select team.')
    }
  }

  async function handleStart() {
    if (!module?.startGame) return
    setStarting(true)
    setError(null)
    try {
      await module.startGame(gameId)
      // Navigate directly rather than waiting on the realtime round-trip --
      // other players in the lobby still transition via the effect below
      // once their subscription picks up games.status changing.
      navigate(`/play/${gameId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game.')
      setStarting(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this lobby? Everyone currently in it will be removed.')) return
    setCancelling(true)
    setError(null)
    try {
      await cancelGame({ gameId })
      // Other players get here via their own realtime subscription noticing
      // the game disappeared (handled in load() above); navigate ourselves
      // right away rather than waiting on that round-trip.
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel lobby.')
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{game.game_types.name} lobby</h1>
        <p className="mt-1 text-sm text-gray-400">
          Join code <span className="font-mono text-orange-400">{game.join_code}</span>
        </p>
        <p className="mt-1 break-all text-xs text-gray-500">{inviteLink}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((team) => (
          <div key={team.id} className="rounded-lg border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{team.name}</h2>
              <button
                onClick={() => handleSelectTeam(team.id)}
                className="rounded-md border border-gray-700 px-2 py-1 text-xs hover:border-gray-500"
              >
                Join
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              {players
                .filter((p) => p.team_id === team.id)
                .map((p) => (
                  <li key={p.id}>
                    {p.display_name}
                    {p.is_host ? ' (host)' : ''}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {players.some((p) => !p.team_id) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400">Unassigned</h2>
          <ul className="mt-1 text-sm text-gray-500">
            {players
              .filter((p) => !p.team_id)
              .map((p) => (
                <li key={p.id}>{p.display_name}</li>
              ))}
          </ul>
        </div>
      )}

      {isHost && module?.LobbySettings && <module.LobbySettings gameId={gameId} />}

      {isHost && (
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={starting || cancelling}
            className="flex-1 rounded-md bg-orange-600 py-2 font-medium hover:bg-orange-500 disabled:opacity-50"
          >
            {starting ? 'Starting...' : 'Start game'}
          </button>
          <button
            onClick={handleCancel}
            disabled={starting || cancelling}
            className="rounded-md border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:border-red-700 disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel lobby'}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
