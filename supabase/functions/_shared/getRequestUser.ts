import { createClient, type User } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const PUBLISHABLE_KEY =
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!

// Verifies the caller's JWT server-side (rather than trusting a client-
// supplied user id) by forwarding the request's Authorization header to a
// client scoped with the publishable key, then asking Supabase Auth who it
// belongs to. Every player signs in anonymously on the client before calling
// any function, so this should resolve for anyone using the app normally.
export async function getRequestUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return data.user
}
