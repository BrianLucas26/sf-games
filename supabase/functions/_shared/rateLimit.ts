import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// Fixed-window limiter backed by rate_limit_hits (see
// 0026_rate_limiting.sql). Keyed by an already-resolved identity (the
// caller's auth user id, not raw IP) -- every endpoint that uses this has
// already called getRequestUser(), so this adds no extra round-trip, and it
// can't be dodged by rotating IPs since getting a new identity here means
// a new anonymous session, which is a separate concern (Turnstile gates
// creating/joining games, not spamming actions inside one you already joined).
export async function checkRateLimit(
  admin: SupabaseClient,
  subject: string,
  action: string,
  limit: number,
  windowSeconds = 60,
): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString()

  const { data, error } = await admin.rpc('increment_rate_limit', {
    p_subject: subject,
    p_action: action,
    p_window_start: windowStart,
  })
  if (error) {
    // Fail open -- a rate-limiter outage shouldn't take down real gameplay.
    // The atomic claim guards already prevent any data-corruption risk;
    // this table only bounds request *volume*.
    console.error(`rate limit check failed for ${action}, failing open:`, error.message)
    return true
  }

  return (data as number) <= limit
}
