import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Games run fine as an anonymous/read-only experience until a lobby is joined,
// so we allow the app to boot without env vars set and surface the gap in the UI
// instead of crashing at import time.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

// The publishable key is safe for the browser (RLS still applies) — never put
// the secret key in a VITE_-prefixed var, it would ship straight to clients.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-publishable-key',
)
