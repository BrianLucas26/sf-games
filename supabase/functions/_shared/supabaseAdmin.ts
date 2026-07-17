import { createClient } from 'jsr:@supabase/supabase-js@2'

// Supabase injects these automatically for every edge function. Checking a
// couple of names defensively since projects on the newer publishable/secret
// key system may expose them under different env var names.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SECRET_KEY =
  Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export function createServiceRoleClient() {
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
