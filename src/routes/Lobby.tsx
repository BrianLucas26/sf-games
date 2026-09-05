import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GAME_TYPE_CONTENT } from '../../content/game-types'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import { getGameModule } from '@/lib/gameRegistry'
import { cancelGame, renameTeam, selectTeam } from '@/lib/gameApi'
import type { GameRow, PlayerRow, TeamRow } from '@/types/database'

interface GameWithType extends GameRow {
  game_types: { slug: string }
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
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [renaming, setRenaming] = useState(false)

  const load = useCallback(() => {
    supabase
      .from('games')
      .select('*, game_types(slug)')
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
      .order('position')
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

  if (!game) return <p className="text-sm text-faint">Loading lobby…</p>

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

  function startEditingTeam(team: TeamRow) {
    setEditingTeamId(team.id)
    setDraftName(team.name)
    setError(null)
  }

  async function handleRenameTeam(teamId: string) {
    if (!draftName.trim()) return
    setRenaming(true)
    setError(null)
    try {
      await renameTeam({ gameId, teamId, name: draftName.trim() })
      setEditingTeamId(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename team.')
    } finally {
      setRenaming(false)
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
    <div className="max-w-2xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {GAME_TYPE_CONTENT[game.game_types.slug]?.name ?? game.game_types.slug} lobby
        </h1>
        <p className="mt-2 text-sm text-muted">
          Join code <span className="font-display tracking-wider text-accent">{game.join_code}</span>
        </p>
        <p className="mt-1 truncate text-xs text-faint">{inviteLink}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((team) => (
          <div key={team.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              {editingTeamId === team.id ? (
                <div className="flex flex-1 items-center gap-1">
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameTeam(team.id)
                      if (e.key === 'Escape') setEditingTeamId(null)
                    }}
                    maxLength={30}
                    className="w-full rounded-md border border-border-strong bg-canvas px-2 py-1 font-display text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
                  />
                  <button
                    onClick={() => handleRenameTeam(team.id)}
                    disabled={renaming || !draftName.trim()}
                    aria-label="Save team name"
                    title="Save"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 12.5 9.5 18 20 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingTeamId(null)}
                    disabled={renaming}
                    aria-label="Cancel rename"
                    title="Cancel"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M6 6l12 12M18 6 6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2 className="font-display font-medium text-ink">{team.name}</h2>
                  {isHost && (
                    <button
                      onClick={() => startEditingTeam(team)}
                      aria-label={`Rename ${team.name}`}
                      title="Rename team"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M15.5 4.5 19.5 8.5 8 20H4v-4L15.5 4.5Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => handleSelectTeam(team.id)}
                className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-ink"
              >
                Join
              </button>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {players
                .filter((p) => p.team_id === team.id)
                .map((p) => (
                  <li key={p.id}>
                    {p.display_name}
                    {p.is_host ? <span className="text-faint"> · host</span> : null}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {players.some((p) => !p.team_id) && (
        <div>
          <h2 className="text-xs font-medium tracking-wide text-faint uppercase">Unassigned</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
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
          <Button onClick={handleStart} disabled={starting || cancelling} className="flex-1">
            {starting ? 'Starting…' : 'Start game'}
          </Button>
          <Button variant="danger" onClick={handleCancel} disabled={starting || cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel lobby'}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
