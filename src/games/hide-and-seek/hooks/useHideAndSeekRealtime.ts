import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { GameStatus } from '@/types/database'
import type {
  HideAndSeekActiveCurseRow,
  HideAndSeekCurseOfferRow,
  HideAndSeekGameStateRow,
  HideAndSeekHandCardRow,
  HideAndSeekMapMarkRow,
  HideAndSeekQuestionRow,
  HideAndSeekRoundRow,
} from '../types'

// Everything the board watches live. Public tables (game state, rounds,
// questions, played curses) stream to everyone; the hiders' hand/draws and
// the seekers' map markup are RLS-scoped to the caller's own team (see 0037),
// so the same unfiltered-by-team subscription only ever delivers your own
// team's rows.
//
// The loaders are returned as well as subscribed: a client must not rely on
// realtime to observe its OWN action, since a postgres_changes event can
// land before the channel finishes establishing (same reason Lobby.tsx
// re-loads after selectTeam).
export function useHideAndSeekRealtime(gameId: string) {
  const [gameState, setGameState] = useState<HideAndSeekGameStateRow | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null)
  const [rounds, setRounds] = useState<HideAndSeekRoundRow[]>([])
  const [questions, setQuestions] = useState<HideAndSeekQuestionRow[]>([])
  const [activeCurses, setActiveCurses] = useState<HideAndSeekActiveCurseRow[]>([])
  const [handCards, setHandCards] = useState<HideAndSeekHandCardRow[]>([])
  const [offers, setOffers] = useState<HideAndSeekCurseOfferRow[]>([])
  const [mapMarks, setMapMarks] = useState<HideAndSeekMapMarkRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadGameState = useCallback(async () => {
    const { data } = await supabase.from('hide_and_seek_game_state').select('*').eq('game_id', gameId).maybeSingle()
    setGameState(data)
  }, [gameId])

  const loadGameStatus = useCallback(async () => {
    const { data } = await supabase.from('games').select('status').eq('id', gameId).maybeSingle()
    if (data) setGameStatus(data.status)
  }, [gameId])

  const loadRounds = useCallback(async () => {
    const { data } = await supabase
      .from('hide_and_seek_rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('round_number')
    if (data) setRounds(data)
  }, [gameId])

  const loadQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('hide_and_seek_questions')
      .select('*')
      .eq('game_id', gameId)
      .order('asked_at')
    if (data) setQuestions(data)
  }, [gameId])

  const loadActiveCurses = useCallback(async () => {
    const { data } = await supabase
      .from('hide_and_seek_active_curses')
      .select('*')
      .eq('game_id', gameId)
      .order('played_at')
    if (data) setActiveCurses(data)
  }, [gameId])

  const loadHand = useCallback(async () => {
    const [cards, pendingOffers] = await Promise.all([
      supabase.from('hide_and_seek_hand_cards').select('*').eq('game_id', gameId).order('drawn_at'),
      supabase.from('hide_and_seek_curse_offers').select('*').eq('game_id', gameId).order('created_at'),
    ])
    if (cards.data) setHandCards(cards.data)
    if (pendingOffers.data) setOffers(pendingOffers.data)
  }, [gameId])

  const loadMapMarks = useCallback(async () => {
    const { data } = await supabase
      .from('hide_and_seek_map_marks')
      .select('*')
      .eq('game_id', gameId)
      .is('deleted_at', null)
      .order('created_at')
    if (data) setMapMarks(data as HideAndSeekMapMarkRow[])
  }, [gameId])

  useEffect(() => {
    Promise.all([
      loadGameState(),
      loadGameStatus(),
      loadRounds(),
      loadQuestions(),
      loadActiveCurses(),
      loadHand(),
      loadMapMarks(),
    ]).then(() => setLoading(false))

    const filter = `game_id=eq.${gameId}`
    const channel = supabase
      .channel(`hide-and-seek-board-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, loadGameStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_game_state', filter }, loadGameState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_rounds', filter }, loadRounds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_questions', filter }, loadQuestions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_active_curses', filter }, loadActiveCurses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_hand_cards', filter }, loadHand)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_curse_offers', filter }, loadHand)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hide_and_seek_map_marks', filter }, loadMapMarks)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, loadGameState, loadGameStatus, loadRounds, loadQuestions, loadActiveCurses, loadHand, loadMapMarks])

  // After any round transition (find confirmed, seek cap, next round
  // started) several tables change at once -- one call re-reads them all.
  const refreshAll = useCallback(
    () => Promise.all([loadGameState(), loadGameStatus(), loadRounds(), loadHand()]),
    [loadGameState, loadGameStatus, loadRounds, loadHand],
  )

  return {
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
    refreshRounds: loadRounds,
    refreshQuestions: loadQuestions,
    refreshActiveCurses: loadActiveCurses,
    refreshHand: loadHand,
    refreshMapMarks: loadMapMarks,
  }
}
