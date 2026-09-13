import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile'

// Trimmed because a stray space in the build variable is invisible but
// fatal: Turnstile validates the key's format and throws rather than
// rendering, and a whitespace-only value is truthy enough to slip past
// the !siteKey guard below -- so the widget silently doesn't exist and
// every Turnstile-gated button stays disabled with nothing on screen to
// explain why. Cost one production launch (sfgamers.com, Sept 2026).
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()

// Shared across every human-gated write (create-game, join-game, ...) so the
// site key + failure handling only lives in one place. Verification itself
// happens server-side in the edge function (see
// supabase/functions/_shared/verifyTurnstile.ts) -- this widget only proves
// a token exists, not that it's valid.
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  if (!siteKey) {
    // Unconfigured local/dev environment -- don't hard-block the flow, but
    // don't silently pretend a token exists either.
    return <p className="text-xs text-faint">Turnstile is not configured (VITE_TURNSTILE_SITE_KEY missing).</p>
  }

  return (
    <TurnstileWidget
      siteKey={siteKey}
      onSuccess={onToken}
      onError={() => onToken(null)}
      onExpire={() => onToken(null)}
      options={{ theme: 'dark', size: 'flexible', action: 'turnstile-spin-v2' }}
    />
  )
}
