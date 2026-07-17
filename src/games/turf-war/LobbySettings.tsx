import { useEffect, useState } from 'react'
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
    <div className="space-y-4 rounded-lg border border-gray-800 p-4">
      <h3 className="font-semibold">Turf War settings</h3>

      <label className="block text-sm">
        Open neighborhoods at once (X)
        <input
          type="number"
          min={1}
          value={settings.open_slot_target}
          onChange={(e) => save({ ...settings, open_slot_target: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1"
        />
      </label>

      <label className="block text-sm">
        Secret neighborhood every (minutes, Y)
        <input
          type="number"
          min={1}
          value={settings.secret_interval_minutes}
          onChange={(e) => save({ ...settings, secret_interval_minutes: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1"
        />
      </label>

      <label className="block text-sm">
        Game length (minutes)
        <input
          type="number"
          min={10}
          value={settings.duration_minutes}
          onChange={(e) => save({ ...settings, duration_minutes: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1"
        />
      </label>

      <label className="block text-sm">
        Claim verification
        <select
          value={settings.verification_mode}
          onChange={(e) =>
            save({ ...settings, verification_mode: e.target.value as TurfWarSettings['verification_mode'] })
          }
          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1"
        >
          <option value="none">None (honor system)</option>
          <option value="gps">GPS only</option>
          <option value="gps_photo">GPS + photo</option>
        </select>
      </label>

      {settings.verification_mode !== 'none' && (
        <label className="block text-sm">
          GPS threshold (meters)
          <input
            type="number"
            min={10}
            value={settings.gps_threshold_meters ?? 100}
            onChange={(e) => save({ ...settings, gps_threshold_meters: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1"
          />
        </label>
      )}

      {saving && <p className="text-xs text-gray-500">Saving...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
