import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Retry wrapper for Supabase operations that may fail with AbortError.
 * 
 * Root cause: Supabase auth-js uses navigator.locks.request() with an
 * AbortController timeout inside getSession(). When the lock can't be
 * acquired in time, it fires abortController.abort(), which throws
 * "AbortError: signal is aborted without reason". This error propagates
 * through fetchWithAuth() → every Supabase query.
 *
 * This wrapper retries the entire Supabase operation (query builder + auth)
 * when an AbortError is detected in the response.
 */
export async function resilientSupabaseCall<T>(
  queryFn: () => PromiseLike<{ data: T; error: any }>,
  maxRetries = 3,
  label = 'query'
): Promise<{ data: T; error: any }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn()

      // Check if the error is an AbortError (returned as error object by postgrest-js)
      const isAbortError =
        result.error?.message?.includes('AbortError') ||
        result.error?.message?.includes('abort') ||
        result.error?.message?.includes('signal is aborted')

      if (isAbortError && attempt < maxRetries) {
        const delay = 300 * (attempt + 1)
        console.warn(
          `⚠️ ${label}: AbortError in response (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
        )
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      return result
    } catch (err: any) {
      // Also handle thrown AbortErrors (from .throwOnError() or edge cases)
      const isAbortError =
        err?.name === 'AbortError' ||
        err?.message?.includes('abort') ||
        err?.message?.includes('signal is aborted')

      if (isAbortError && attempt < maxRetries) {
        const delay = 300 * (attempt + 1)
        console.warn(
          `⚠️ ${label}: AbortError thrown (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
        )
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      throw err
    }
  }

  // Should never reach here
  return { data: null as T, error: { message: 'resilientSupabaseCall: exhausted retries' } }
}

export function handleSupabaseError(error: any, context: string) {
  console.error(`[Supabase Error - ${context}]:`, error)
  throw new Error(`${context}: ${error.message || 'Unknown error'}`)
}
