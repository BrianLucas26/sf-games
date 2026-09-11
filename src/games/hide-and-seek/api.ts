import { callFunction } from '@/lib/functions'
import type { GameRow } from '@/types/database'
import type {
  HideAndSeekActiveCurseRow,
  HideAndSeekCurseOfferRow,
  HideAndSeekMapMarkRow,
  HideAndSeekQuestionRow,
  HideAndSeekRoundRow,
  MarkData,
} from './types'

export function startHideAndSeek(gameId: string) {
  return callFunction<{ game: GameRow }>('hide-and-seek-start', { game_id: gameId })
}

export function startNextRound(gameId: string) {
  return callFunction<{ round?: HideAndSeekRoundRow }>('hide-and-seek-start-round', { game_id: gameId })
}

export function askQuestion(params: { gameId: string; questionKey: string; location: [number, number] | null }) {
  return callFunction<{ question: HideAndSeekQuestionRow }>('hide-and-seek-ask-question', {
    game_id: params.gameId,
    question_key: params.questionKey,
    lng: params.location?.[0],
    lat: params.location?.[1],
  })
}

export function answerQuestion(params: { gameId: string; questionId: string; answer: string }) {
  return callFunction<{ question: HideAndSeekQuestionRow; offer: HideAndSeekCurseOfferRow | null }>(
    'hide-and-seek-answer-question',
    { game_id: params.gameId, question_id: params.questionId, answer: params.answer },
  )
}

export function keepCurses(params: { gameId: string; offerId: string; keepCardIds: string[]; discardCardIds: string[] }) {
  return callFunction<{ ok: true }>('hide-and-seek-keep-curses', {
    game_id: params.gameId,
    offer_id: params.offerId,
    keep_card_ids: params.keepCardIds,
    discard_card_ids: params.discardCardIds,
  })
}

export function playCurse(params: { gameId: string; cardId: string }) {
  return callFunction<{ curse: HideAndSeekActiveCurseRow }>('hide-and-seek-play-curse', {
    game_id: params.gameId,
    card_id: params.cardId,
  })
}

export function clearCurse(params: { gameId: string; activeCurseId: string }) {
  return callFunction<{ curse: HideAndSeekActiveCurseRow }>('hide-and-seek-clear-curse', {
    game_id: params.gameId,
    active_curse_id: params.activeCurseId,
  })
}

export function foundAction(params: { gameId: string; action: 'claim' | 'confirm' | 'reject' }) {
  return callFunction<{ round: HideAndSeekRoundRow }>('hide-and-seek-found', {
    game_id: params.gameId,
    action: params.action,
  })
}

export function resolveRound(gameId: string) {
  return callFunction<{ skipped: boolean }>('hide-and-seek-resolve-round', { game_id: gameId })
}

export function addMapMark(params: { gameId: string; mark: MarkData }) {
  return callFunction<{ mark: HideAndSeekMapMarkRow }>('hide-and-seek-map-marks', {
    game_id: params.gameId,
    op: 'add',
    kind: params.mark.kind,
    data: params.mark.data,
  })
}

export function deleteMapMark(params: { gameId: string; markId: string }) {
  return callFunction<{ ok: true }>('hide-and-seek-map-marks', {
    game_id: params.gameId,
    op: 'delete',
    mark_id: params.markId,
  })
}

export function clearMapMarks(gameId: string) {
  return callFunction<{ ok: true }>('hide-and-seek-map-marks', { game_id: gameId, op: 'clear' })
}
