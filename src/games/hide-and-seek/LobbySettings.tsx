import { useEffect, useState } from 'react'
import { Field, Select, TextInput } from '@/components/Field'
import { supabase } from '@/lib/supabaseClient'
import { updateGameSettings } from '@/lib/gameApi'
import { DEFAULT_HIDE_AND_SEEK_SETTINGS, type HideAndSeekSettings } from './types'

export function LobbySettings({ gameId }: { gameId: string }) {
  const [settings, setSettings] = useState<HideAndSeekSettings>(DEFAULT_HIDE_AND_SEEK_SETTINGS)
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
          setSettings({ ...DEFAULT_HIDE_AND_SEEK_SETTINGS, ...(data.settings as Partial<HideAndSeekSettings>) })
        }
      })
  }, [gameId])

  async function save(next: HideAndSeekSettings) {
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
      <h3 className="font-display font-medium text-ink">Hide and Seek settings</h3>

      <Field label="Hiding period (minutes)">
        <TextInput
          type="number"
          min={1}
          max={240}
          value={settings.hiding_period_minutes}
          onChange={(e) => save({ ...settings, hiding_period_minutes: Number(e.target.value) })}
        />
      </Field>

      <Field label="Rounds">
        <Select
          value={settings.rounds_per_team}
          onChange={(e) => save({ ...settings, rounds_per_team: Number(e.target.value) })}
        >
          <option value={1}>Each team hides once (2 rounds)</option>
          <option value={2}>Each team hides twice (4 rounds)</option>
          <option value={3}>Each team hides 3 times (6 rounds)</option>
          <option value={4}>Each team hides 4 times (8 rounds)</option>
          <option value={5}>Each team hides 5 times (10 rounds)</option>
        </Select>
      </Field>

      <Field label="Win condition">
        <Select
          value={settings.win_condition}
          onChange={(e) => save({ ...settings, win_condition: e.target.value as HideAndSeekSettings['win_condition'] })}
        >
          <option value="total_time">Longest total hide time</option>
          <option value="longest_single">Longest single hide</option>
        </Select>
      </Field>

      <Field label="Game size">
        <Select
          value={settings.game_size}
          onChange={(e) => save({ ...settings, game_size: e.target.value as HideAndSeekSettings['game_size'] })}
        >
          <option value="small">Small (shorter game, tighter area)</option>
          <option value="large">Large (longer game, city-wide)</option>
        </Select>
      </Field>

      <Field label="Max seeking time (minutes, 0 = no limit)">
        <TextInput
          type="number"
          min={0}
          max={600}
          value={settings.max_seek_minutes}
          onChange={(e) => save({ ...settings, max_seek_minutes: Number(e.target.value) })}
        />
      </Field>

      <Field label="Curse hand limit">
        <TextInput
          type="number"
          min={1}
          max={20}
          value={settings.hand_limit}
          onChange={(e) => save({ ...settings, hand_limit: Number(e.target.value) })}
        />
      </Field>

      <p className="text-xs text-faint">
        Game size picks which of each curse's printed values apply -- a curse that lasts &quot;[S30, M45,
        L60] minutes&quot; runs 30 in a small game and 45 in a large one. The first team listed above hides first. If the seek limit runs out, the hiders are credited with the full time.
      </p>

      {saving && <p className="text-xs text-faint">Saving…</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
