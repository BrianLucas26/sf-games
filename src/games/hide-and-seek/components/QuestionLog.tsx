import { useState } from 'react'
import { Button } from '@/components/Button'
import { TextInput } from '@/components/Field'
import { formatCost } from '../../../../content/hide-and-seek-questions'
import { answerQuestion } from '../api'
import type { HideAndSeekQuestionRow, HideAndSeekRole } from '../types'

interface QuestionLogProps {
  gameId: string
  // All of this round's questions, oldest first -- Q-numbers come from this
  // order, so they match the map's ask points whatever `show` filters to.
  questions: HideAndSeekQuestionRow[]
  show?: 'all' | 'pending' | 'answered'
  myRole: HideAndSeekRole | null
  playerNames: Record<string, string>
  onAnswered: () => Promise<unknown>
}

function AnswerForm({ gameId, question, onAnswered }: { gameId: string; question: HideAndSeekQuestionRow; onAnswered: () => Promise<unknown> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(answer: string) {
    if (!answer.trim()) return
    setBusy(true)
    setError(null)
    try {
      await answerQuestion({ gameId, questionId: question.id, answer })
      await onAnswered()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to answer.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-2.5 space-y-2">
      {question.answer_options ? (
        <div className="flex flex-wrap gap-2">
          {question.answer_options.map((option) => (
            <Button key={option} className="flex-1" disabled={busy} onClick={() => submit(option)}>
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit(text)
          }}
        >
          <TextInput value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Your answer" />
          <Button type="submit" disabled={busy || !text.trim()}>
            Send
          </Button>
        </form>
      )}
      <p className="text-xs text-faint">
        Answering earns you a curse draw ({formatCost({ draw: question.draw_count, keep: question.keep_count })}).
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// Every question asked this round with its answer. For the hiders, the
// unanswered one (there's at most one) gets the answer controls inline.
export function QuestionLog({ gameId, questions, show = 'all', myRole, playerNames, onAnswered }: QuestionLogProps) {
  const numbered = questions
    .map((q, i) => ({ q, n: i + 1 }))
    .filter(({ q }) => (show === 'pending' ? !q.answered_at : show === 'answered' ? Boolean(q.answered_at) : true))

  if (numbered.length === 0) {
    if (show === 'pending') return null
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Questions</h3>
        <p className="mt-2 text-sm text-muted">No {show === 'answered' ? 'answered ' : ''}questions yet this round.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-medium tracking-wide text-faint uppercase">
        {show === 'pending' ? 'The seekers asked' : 'Questions'}
      </h3>
      <ol className="mt-3 space-y-3">
        {numbered
          .reverse()
          .map(({ q, n }) => {
            const pending = !q.answered_at
            const asker = q.asked_by_player_id ? playerNames[q.asked_by_player_id] : null
            return (
              <li
                key={q.id}
                className={`rounded-lg border p-3 ${pending ? 'border-accent/40 bg-accent/[0.06]' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink">
                    <span className="mr-1.5 font-display text-xs text-faint">Q{n}</span>
                    {q.prompt}
                  </p>
                  <span className="shrink-0 text-xs text-faint">
                    {new Date(q.asked_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-faint">
                  {asker ? `Asked by ${asker}` : 'Asked'}
                  {q.asked_from_lat !== null ? ` · from Q${n} on the map` : ''}
                </p>
                {pending ? (
                  myRole === 'hider' ? (
                    <AnswerForm gameId={gameId} question={q} onAnswered={onAnswered} />
                  ) : (
                    <p className="mt-2 text-sm text-muted">Waiting for the hiders to answer…</p>
                  )
                ) : (
                  <p className="mt-2 text-sm">
                    <span className="text-muted">Answer: </span>
                    <span className="font-medium text-ink">{q.answer}</span>
                  </p>
                )}
              </li>
            )
          })}
      </ol>
    </div>
  )
}
