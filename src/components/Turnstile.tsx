import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile'

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

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
