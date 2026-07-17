import { supabase } from './supabaseClient'

// Every edge function verifies the caller via their auth JWT (see
// supabase/functions/_shared/getRequestUser.ts), so any write needs a session
// first. Anonymous auth is enough -- players never need a password, but
// secret-zone RLS still needs a real auth.uid() to scope reads by team.
export async function ensureAnonymousSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}
