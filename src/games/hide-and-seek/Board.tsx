import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import { useNow } from '@/hooks/useNow'
import { TEAM_COLORS } from '@/lib/teamColors'
import type { PlayerRow, TeamRow } from '@/types/database'
import { resolveRound } from './api'
import { ActiveCurses } from './components/ActiveCurses'
import { CurseHand } from './components/CurseHand'
import { HideAndSeekStandings } from './components/HideAndSeekStandings'
import { QuestionBank } from './components/QuestionBank'
import { QuestionLog } from './components/QuestionLog'
import { RoundStatus } from './components/RoundStatus'
import { useHideAndSeekRealtime } from './hooks/useHideAndSeekRealtime'
import { useRegionSets } from './hooks/useRegionSets'
import type { AskPoint } from './map/HideAndSeekMap'
import { MapPanel } from './map/MapPanel'
import { isCurseActive, type HideAndSeekRole } from './types'

// A client retries the seek-limit fast path at most this often while its
// countdown sits at zero (clock skew can make the first call land early).
const RESOLVE_RETRY_MS = 2000

export function Board({ gameId }: { gameId: string }) {
  const { player } = useCurrentPlayer(gameId)
  const {
    gameState,
    gameStatus,
    rounds,
    questions,
    activeCurses,
    handCards,
    offers,
    mapMarks,
    loading,
    refreshAll,
    refreshQuestions,
    refreshActiveCurses,
    refreshHand,
    refreshMapMarks,
  } = useHideAndSeekRealtime(gameId)
  const regions = useRegionSets()
  const now = useNow()
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])

  useEffect(() => {
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
      .then(({ data }) => data && setPlayers(data))
  }, [gameId])

  const teamColorById = useMemo(() => {
    const map: Record<string, string> = {}
    teams.forEach((t, i) => {
      map[t.id] = TEAM_COLORS[i % TEAM_COLORS.length]
    })
    return map
  }, [teams])
  const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])
  const playerNames = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.display_name])), [players])

  const round = rounds[rounds.length - 1] ?? null
  const gameEnded = gameStatus === 'completed'
  const myRole: HideAndSeekRole | null =
    !round || !player?.team_id
      ? null
      : player.team_id === round.hider_team_id
        ? 'hider'
        : player.team_id === round.seeker_team_id
          ? 'seeker'
          : null

  const roundQuestions = useMemo(() => (round ? questions.filter((q) => q.round_id === round.id) : []), [questions, round])
  const roundCards = useMemo(() => (round ? handCards.filter((c) => c.round_id === round.id) : []), [handCards, round])
  const roundOffers = useMemo(() => (round ? offers.filter((o) => o.round_id === round.id) : []), [offers, round])
  const roundMarks = useMemo(() => (round ? mapMarks.filter((m) => m.round_id === round.id) : []), [mapMarks, round])
  const cursesInEffect =
    round && round.status === 'active'
      ? activeCurses.filter((c) => c.round_id === round.id && isCurseActive(c, now))
      : []

  const askPoints = useMemo<AskPoint[]>(
    () =>
      roundQuestions.flatMap((q, i) =>
        q.asked_from_lat !== null && q.asked_from_lng !== null
          ? [{ id: q.id, at: [q.asked_from_lng, q.asked_from_lat] as [number, number], label: `Q${i + 1}` }]
          : [],
      ),
    [roundQuestions],
  )

  const askedKeys = useMemo(() => new Set(roundQuestions.map((q) => q.question_key)), [roundQuestions])

  // Seek-limit fast path: whoever's clock hits zero first ends the round
  // rather than waiting up to a minute for hide_and_seek_tick().
  const lastResolveAttemptRef = useRef(0)
  const seekCapPassed =
    round?.status === 'active' &&
    !round.found_claimed_at &&
    round.seek_ends_at !== null &&
    now >= new Date(round.seek_ends_at).getTime()
  useEffect(() => {
    if (!seekCapPassed || Date.now() - lastResolveAttemptRef.current < RESOLVE_RETRY_MS) return
    lastResolveAttemptRef.current = Date.now()
    resolveRound(gameId)
      .then(() => refreshAll())
      .catch(() => {
        // Retried on a later tick.
      })
  }, [seekCapPassed, now, gameId, refreshAll])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  if (!gameState || !round) {
    return <p className="text-sm text-muted">Waiting for the game to start…</p>
  }

  const roundActive = round.status === 'active'
  const hidingPeriod = roundActive && now < new Date(round.hiding_ends_at).getTime()
  const pendingQuestion = roundQuestions.find((q) => !q.answered_at)
  const blockingCurse = cursesInEffect.find((c) => c.blocks_questions)

  const lockedReason = !roundActive
    ? 'This round is over.'
    : hidingPeriod
      ? 'Questions open when the hiding period ends.'
      : round.found_claimed_at
        ? 'Waiting on the hiders to confirm your find.'
        : pendingQuestion
          ? 'Waiting for the hiders to answer your last question.'
          : blockingCurse
            ? `Cursed: ${blockingCurse.name}. Clear it first.`
            : null

  const onQuestionsChanged = () => Promise.all([refreshQuestions(), refreshHand()])

  return (
    <div className="space-y-4">
      <RoundStatus
        gameId={gameId}
        round={round}
        gameState={gameState}
        teamsById={teamsById}
        teamColorById={teamColorById}
        myRole={myRole}
        gameEnded={gameEnded}
        now={now}
        onChanged={refreshAll}
      />

      <ActiveCurses gameId={gameId} curses={cursesInEffect} myRole={myRole} onChanged={refreshActiveCurses} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* min-w-0: the map's sideways-scrolling tool row must not stretch the column on phones. */}
        <div className="min-w-0 space-y-4">
          {/* The hiders' most urgent job is answering -- keep it above the map on mobile. */}
          {myRole === 'hider' && (
            <QuestionLog
              gameId={gameId}
              questions={roundQuestions}
              show="pending"
              myRole={myRole}
              playerNames={playerNames}
              onAnswered={onQuestionsChanged}
            />
          )}
          <MapPanel
            gameId={gameId}
            regions={regions}
            marks={roundMarks}
            askPoints={askPoints}
            editable={myRole === 'seeker' && roundActive}
            onMarksChanged={refreshMapMarks}
          />
        </div>

        <div className="min-w-0 space-y-4">
          {myRole === 'seeker' && roundActive && (
            <QuestionBank
              gameId={gameId}
              gameSize={gameState.game_size}
              askedKeys={askedKeys}
              lockedReason={lockedReason}
              onAsked={refreshQuestions}
            />
          )}

          {myRole === 'hider' && (
            <CurseHand
              gameId={gameId}
              cards={roundCards}
              offers={roundOffers}
              questions={roundQuestions}
              handLimit={gameState.hand_limit}
              roundActive={roundActive}
              onChanged={() => Promise.all([refreshHand(), refreshActiveCurses()])}
            />
          )}

          <QuestionLog
            gameId={gameId}
            questions={roundQuestions}
            show={myRole === 'hider' ? 'answered' : 'all'}
            myRole={myRole}
            playerNames={playerNames}
            onAnswered={onQuestionsChanged}
          />

          <HideAndSeekStandings
            teams={teams}
            rounds={rounds}
            gameState={gameState}
            teamColorById={teamColorById}
            gameEnded={gameEnded}
            now={now}
          />
        </div>
      </div>
    </div>
  )
}
