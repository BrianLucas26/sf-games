import { useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { formatCost, HIDE_AND_SEEK_QUESTIONS, type HideAndSeekQuestion } from '../../../../content/hide-and-seek-questions'
import { askQuestion } from '../api'
import { getCurrentLngLat } from '../map/location'

interface QuestionBankProps {
  gameId: string
  askedKeys: Set<string>
  // Why asking is locked right now (hiding period, pending answer, curse, ...), or null.
  lockedReason: string | null
  onAsked: () => Promise<unknown>
}

// How long to wait for a GPS fix before asking without one -- location is a
// convenience for the hiders, not worth stalling the question over.
const LOCATION_TIMEOUT_MS = 5000

// The seekers' question bank, grouped by category. A question grays out once
// asked this round. Tapping one expands it; a second explicit tap asks it, so
// a stray tap on a phone can't burn a question.
export function QuestionBank({ gameId, askedKeys, lockedReason, onAsked }: QuestionBankProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = useMemo(() => {
    const groups = new Map<string, HideAndSeekQuestion[]>()
    for (const q of HIDE_AND_SEEK_QUESTIONS) {
      groups.set(q.category, [...(groups.get(q.category) ?? []), q])
    }
    return [...groups.entries()]
  }, [])

  async function ask(question: HideAndSeekQuestion) {
    setBusy(true)
    setError(null)
    try {
      const location = await getCurrentLngLat(LOCATION_TIMEOUT_MS)
      await askQuestion({ gameId, questionKey: question.id, location })
      setSelectedKey(null)
      await onAsked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ask question.')
    } finally {
      setBusy(false)
    }
  }

  const remaining = HIDE_AND_SEEK_QUESTIONS.filter((q) => !askedKeys.has(q.id)).length

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-faint uppercase">Question bank</h3>
        <span className="text-xs text-faint">{remaining} left</span>
      </div>
      {lockedReason && (
        <p className="mt-2 rounded-lg border border-border-strong bg-canvas px-3 py-2 text-xs text-muted">{lockedReason}</p>
      )}

      <div className="mt-3 space-y-4">
        {categories.map(([category, questions]) => (
          <div key={category}>
            <p className="mb-1.5 text-xs font-medium text-muted">{category}</p>
            <ul className="space-y-1.5">
              {questions.map((q) => {
                const asked = askedKeys.has(q.id)
                const selected = selectedKey === q.id && !asked
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      disabled={asked}
                      onClick={() => setSelectedKey(selected ? null : q.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        asked
                          ? 'cursor-not-allowed border-border text-faint opacity-50'
                          : selected
                            ? 'border-accent bg-accent/[0.06] text-ink'
                            : 'border-border text-ink hover:border-border-strong hover:bg-surface-hover'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className={asked ? 'line-through' : ''}>{q.prompt}</span>
                        <span className="shrink-0 text-xs text-muted">{asked ? 'Asked' : formatCost(q.cost)}</span>
                      </span>
                    </button>
                    {selected && (
                      <div className="mt-1.5 space-y-2 px-1">
                        {q.description && <p className="text-xs text-muted">{q.description}</p>}
                        <Button className="w-full" disabled={busy || Boolean(lockedReason)} onClick={() => ask(q)}>
                          {busy ? 'Asking…' : 'Ask this question'}
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
