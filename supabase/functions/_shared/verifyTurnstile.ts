const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET')
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// Server-side check for the human-gated writes (create-game, join-game).
// This is the one control that actually matters against a bot calling the
// edge function directly (curl, a script) rather than going through the
// site -- Cloudflare's Bot Fight Mode/WAF only sees traffic that hits your
// own domain, not direct calls to *.supabase.co, so verifying the token
// here is what closes that gap.
export async function verifyTurnstile(token: string | undefined, remoteIp?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) {
    // Unconfigured (e.g. local dev without the secret set) -- fail closed
    // rather than silently accepting every request.
    console.error('TURNSTILE_SECRET is not set.')
    return false
  }
  if (!token) return false

  const res = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    }),
  })
  if (!res.ok) return false

  const result = (await res.json()) as { success: boolean }
  return result.success === true
}
