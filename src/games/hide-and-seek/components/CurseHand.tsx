import { useState } from 'react'
import { Button } from '@/components/Button'
import { keepCurses, playCurse } from '../api'
import type { HideAndSeekCurseOfferRow, HideAndSeekHandCardRow, HideAndSeekQuestionRow } from '../types'

interface CurseHandProps {
  gameId: string
  // This round only, already filtered by the board.
  cards: HideAndSeekHandCardRow[]
  offers: HideAndSeekCurseOfferRow[]
  questions: HideAndSeekQuestionRow[]
  handLimit: number
  roundActive: boolean
  onChanged: () => Promise<unknown>
}

export function CurseTags({ durationMinutes, blocksQuestions }: { durationMinutes: number | null; blocksQuestions: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] text-muted">
        {durationMinutes ? `${durationMinutes} min` : 'Task'}
      </span>
      {blocksQuestions && (
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] text-danger">Blocks questions</span>
      )}
    </span>
  )
}

function CardBody({ card }: { card: HideAndSeekHandCardRow }) {
  return (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="font-medium text-ink">{card.name}</span>
        <CurseTags durationMinutes={card.duration_minutes} blocksQuestions={card.blocks_questions} />
      </span>
      <span className="mt-1 block text-xs text-muted">{card.description}</span>
    </>
  )
}

function OfferPicker({
  gameId,
  offer,
  offered,
  held,
  handLimit,
  sourcePrompt,
  onChanged,
}: {
  gameId: string
  offer: HideAndSeekCurseOfferRow
  offered: HideAndSeekHandCardRow[]
  held: HideAndSeekHandCardRow[]
  handLimit: number
  sourcePrompt: string | null
  onChanged: () => Promise<unknown>
}) {
  const [keepIds, setKeepIds] = useState<string[]>([])
  const [discardIds, setDiscardIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mirrors hide-and-seek-keep-curses: a keep-2 draw can't exceed a hand limit of 1.
  const keepCount = Math.min(offer.keep_count, handLimit)
  const mustDiscard = Math.max(0, held.length + keepCount - handLimit)
  const ready = keepIds.length === keepCount && discardIds.length === mustDiscard

  function toggle(list: string[], setList: (ids: string[]) => void, id: string, max: number) {
    if (list.includes(id)) setList(list.filter((x) => x !== id))
    else if (max === 1) setList([id])
    else if (list.length < max) setList([...list, id])
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await keepCurses({ gameId, offerId: offer.id, keepCardIds: keepIds, discardCardIds: discardIds })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to keep curses.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-accent/40 bg-accent/[0.06] p-3">
      <p className="text-sm text-ink">
        You drew {offered.length} -- keep {keepCount}.
        {sourcePrompt && <span className="block text-xs text-muted">For answering “{sourcePrompt}”</span>}
      </p>
      <ul className="space-y-1.5">
        {offered.map((card) => {
          const selected = keepIds.includes(card.id)
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => toggle(keepIds, setKeepIds, card.id, keepCount)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selected ? 'border-accent bg-accent/15' : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <CardBody card={card} />
              </button>
            </li>
          )
        })}
      </ul>

      {mustDiscard > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-danger">
            Your hand is full ({handLimit} max) -- pick {mustDiscard} from your hand to discard.
          </p>
          <ul className="space-y-1.5">
            {held.map((card) => {
              const selected = discardIds.includes(card.id)
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => toggle(discardIds, setDiscardIds, card.id, mustDiscard)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selected ? 'border-danger bg-danger/10 line-through' : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
                    <CardBody card={card} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Button className="w-full" disabled={!ready || busy} onClick={submit}>
        {busy ? 'Saving…' : `Keep ${keepCount === 1 ? 'this curse' : 'these curses'}`}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// The hiders' hand: resolve pending draws (oldest first), then play held
// curses on the seekers whenever it suits them.
export function CurseHand({ gameId, cards, offers, questions, handLimit, roundActive, onChanged }: CurseHandProps) {
  const [busyCardId, setBusyCardId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const held = cards.filter((c) => c.status === 'held')
  const pendingOffers = roundActive ? offers.filter((o) => !o.resolved_at) : []
  const currentOffer = pendingOffers[0]

  async function play(card: HideAndSeekHandCardRow) {
    if (!confirm(`Play ${card.name} on the seekers?`)) return
    setBusyCardId(card.id)
    setError(null)
    try {
      await playCurse({ gameId, cardId: card.id })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play curse.')
    } finally {
      setBusyCardId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Your curses</h3>
        <span className="text-xs text-faint">
          {held.length} / {handLimit}
        </span>
      </div>

      {currentOffer && (
        <div className="mt-3">
          <OfferPicker
            key={currentOffer.id}
            gameId={gameId}
            offer={currentOffer}
            offered={cards.filter((c) => c.offer_id === currentOffer.id && c.status === 'offered')}
            held={held}
            handLimit={handLimit}
            sourcePrompt={questions.find((q) => q.id === currentOffer.question_id)?.prompt ?? null}
            onChanged={onChanged}
          />
          {pendingOffers.length > 1 && (
            <p className="mt-1.5 text-xs text-faint">
              +{pendingOffers.length - 1} more draw{pendingOffers.length > 2 ? 's' : ''} waiting after this one.
            </p>
          )}
        </div>
      )}

      {held.length === 0 && !currentOffer ? (
        <p className="mt-2 text-sm text-muted">
          No curses yet -- you draw some every time you answer one of the seekers' questions.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {held.map((card) => (
            <li key={card.id} className="rounded-lg border border-border p-3 text-sm">
              <CardBody card={card} />
              {roundActive && (
                <Button
                  variant="secondary"
                  className="mt-2 w-full py-1.5"
                  disabled={busyCardId !== null}
                  onClick={() => play(card)}
                >
                  {busyCardId === card.id ? 'Playing…' : 'Play on the seekers'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
