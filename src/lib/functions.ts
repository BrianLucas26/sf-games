import { supabase } from './supabaseClient'
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
      try {
        const parsed = (await context.json()) as ErrorBody
        if (parsed?.error) throw new Error(parsed.error)
      } catch {
        // fall through to the generic error below
      }
    }
    throw error
  }

  if (data && 'error' in data && data.error) {
    throw new Error(data.error)
  }

  return data as T
}
