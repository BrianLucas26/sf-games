import { supabase, supabasePublishableKey, supabaseUrl } from './supabaseClient'
import { ensureAnonymousSession } from './auth'

interface ErrorBody {
  error?: string
}

// Thin wrapper every game's api.ts (and the generic lobby routes) call
// through, so edge-function error bodies surface as a normal thrown Error
// regardless of whether supabase-js treated the response as a hard failure.
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  await ensureAnonymousSession()

  const { data, error } = await supabase.functions.invoke<T & ErrorBody>(name, { body })

  if (error) {
    const context = (error as { context?: Response }).context
    if (context) {
      // Parse inside the try, but throw outside it -- a `throw` in the try
      // would be swallowed by this very catch, masking every real
      // edge-function error as the generic "non-2xx status code".
      let message: string | null = null
      try {
        const parsed = (await context.json()) as ErrorBody
        message = parsed?.error ?? null
      } catch {
        // Body wasn't JSON -- fall through to the generic error below.
      }
      if (message) throw new Error(message)
    }
    throw error
  }

  if (data && 'error' in data && data.error) {
    throw new Error(data.error)
  }

  return data as T
}

// For endpoints that return a binary file (e.g. a ZIP) rather than JSON --
// supabase.functions.invoke assumes JSON, so this goes through a raw fetch
// instead and triggers the browser's native save/share flow, which works
// the same way on mobile Safari/Chrome as on desktop.
export async function downloadFunctionFile(
  name: string,
  body: Record<string, unknown>,
  fallbackFilename: string,
): Promise<void> {
  const session = await ensureAnonymousSession()
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as ErrorBody | null
    throw new Error(parsed?.error ?? `Download failed (${res.status})`)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? fallbackFilename

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  // Mobile Safari/Chrome need the link actually attached to the DOM to
  // reliably trigger their native save/share sheet on tap.
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
