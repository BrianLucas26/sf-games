import { useEffect, useState } from 'react'
import { Field, Select, TextInput } from '@/components/Field'
import { supabase } from '@/lib/supabaseClient'
import { updateGameSettings } from '@/lib/gameApi'
import { DEFAULT_LOCKOUT_SETTINGS, type LockoutSettings } from './types'

export function LobbySettings({ gameId }: { gameId: string }) {
  const [settings, setSettings] = useState<LockoutSettings>(DEFAULT_LOCKOUT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('games')
      .select('settings')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (data?.settings) {
          setSettings({ ...DEFAULT_LOCKOUT_SETTINGS, ...(data.settings as Partial<LockoutSettings>) })
        }
      })
  }, [gameId])

  async function save(next: LockoutSettings) {
    setSettings(next)
    setSaving(true)
    setError(null)
    try {
      await updateGameSettings({ gameId, settings: next })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display font-medium text-ink">Lockout settings</h3>

      <Field label="Board size">
        <Select
          value={settings.board_size}
          onChange={(e) => save({ ...settings, board_size: Number(e.target.value) as LockoutSettings['board_size'] })}
        >
          <option value={3}>3 x 3</option>
          <option value={4}>4 x 4</option>
          <option value={5}>5 x 5</option>
          <option value={6}>6 x 6</option>
          <option value={7}>7 x 7</option>
        </Select>
      </Field>

      <Field label="Game mode">
        <Select
          value={settings.game_mode}
          onChange={(e) => save({ ...settings, game_mode: e.target.value as LockoutSettings['game_mode'] })}
        >
          <option value="combo">Combo (bingo or majority, whichever first)</option>
          <option value="bingo">Bingo (line wins)</option>
          <option value="majority">Majority (most cells wins)</option>
        </Select>
      </Field>

      <Field label="If time runs out">
        <Select
          value={settings.tie_breaker}
          onChange={(e) => save({ ...settings, tie_breaker: e.target.value as LockoutSettings['tie_breaker'] })}
        >
          <option value="sudden_death">Sudden death (play until someone pulls ahead)</option>
          <option value="first_to_score">First team to reach the tied count wins</option>
          <option value="tie">It's a tie</option>
        </Select>
      </Field>

      <Field label="Time limit (minutes)">
        <TextInput
          type="number"
          min={5}
          value={settings.duration_minutes}
          onChange={(e) => save({ ...settings, duration_minutes: Number(e.target.value) })}
        />
      </Field>

      <Field label="Veto period (minutes)">
        <TextInput
          type="number"
          min={0}
          value={settings.veto_period_minutes}
          onChange={(e) => save({ ...settings, veto_period_minutes: Number(e.target.value) })}
        />
      </Field>

      <Field label="Vetoes per team">
        <Select
          value={settings.veto_limit}
          onChange={(e) => save({ ...settings, veto_limit: Number(e.target.value) })}
        >
          <option value={0}>0 (no vetoes)</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </Select>
      </Field>

      {saving && <p className="text-xs text-faint">Saving…</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
