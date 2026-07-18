import { useEffect, useState } from 'react'
import { Field, Select, TextInput } from '@/components/Field'
import { supabase } from '@/lib/supabaseClient'
import { updateGameSettings } from '@/lib/gameApi'
import { DEFAULT_TURF_WAR_SETTINGS, type TurfWarSettings } from './types'

export function LobbySettings({ gameId }: { gameId: string }) {
  const [settings, setSettings] = useState<TurfWarSettings>(DEFAULT_TURF_WAR_SETTINGS)
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
          setSettings({ ...DEFAULT_TURF_WAR_SETTINGS, ...(data.settings as Partial<TurfWarSettings>) })
        }
      })
  }, [gameId])

  async function save(next: TurfWarSettings) {
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
      <h3 className="font-display font-medium text-ink">Turf War settings</h3>

      <Field label="Open neighborhoods at once (X)">
        <TextInput
          type="number"
          min={1}
          value={settings.open_slot_target}
          onChange={(e) => save({ ...settings, open_slot_target: Number(e.target.value) })}
        />
      </Field>

      <Field label="Secret neighborhood every (minutes, Y)">
        <TextInput
          type="number"
          min={1}
          value={settings.secret_interval_minutes}
          onChange={(e) => save({ ...settings, secret_interval_minutes: Number(e.target.value) })}
        />
      </Field>

      <Field label="Game length (minutes)">
        <TextInput
          type="number"
          min={10}
          value={settings.duration_minutes}
          onChange={(e) => save({ ...settings, duration_minutes: Number(e.target.value) })}
        />
      </Field>

      <Field label="Claim verification">
        <Select
          value={settings.verification_mode}
          onChange={(e) =>
            save({ ...settings, verification_mode: e.target.value as TurfWarSettings['verification_mode'] })
          }
        >
          <option value="none">None (honor system)</option>
          <option value="gps">GPS only</option>
          <option value="gps_photo">GPS + photo</option>
        </Select>
      </Field>

      {settings.verification_mode !== 'none' && (
        <Field label="GPS threshold (meters)">
          <TextInput
            type="number"
            min={10}
            value={settings.gps_threshold_meters ?? 100}
            onChange={(e) => save({ ...settings, gps_threshold_meters: Number(e.target.value) })}
          />
        </Field>
      )}

      {saving && <p className="text-xs text-faint">Saving…</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
