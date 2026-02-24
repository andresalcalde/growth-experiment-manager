import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

/**
 * Cached access token to bypass navigator lock contention.
 *
 * Root cause of AbortError: Supabase auth-js uses navigator.locks.request()
 * inside getSession(). Every Supabase query calls fetchWithAuth() which calls
 * getAccessToken() → getSession() → navigator.locks.request(). When the lock
 * is contended/stuck, the AbortController fires and kills the request.
 *
 * Solution: Cache the access token and refresh it via onAuthStateChange.
 * Use a custom fetch that applies the cached token directly, bypassing
 * the navigator lock entirely for database queries.
 */
let cachedAccessToken: string | null = null

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token
}

/**
 * Custom fetch that applies the cached auth token directly.
 * This bypasses Supabase's internal fetchWithAuth → getSession() → navigator.locks chain.
 */
const customFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers)

  if (!headers.has('apikey')) {
    headers.set('apikey', supabaseAnonKey)
  }

  if (!headers.has('Authorization')) {
    const token = cachedAccessToken ?? supabaseAnonKey
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(input, { ...init, headers })
}

/**
 * Custom lock implementation that replaces navigator.locks.
 *
 * navigator.locks can deadlock when: the initial getSession() acquires the
 * exclusive lock, but the operation inside (token refresh / storage read)
 * hangs indefinitely. The lock is never released, and ALL subsequent
 * Supabase calls (rpc, from, etc.) queue behind it forever.
 *
 * Since we already cache the access token via onAuthStateChange, we don't
 * need strict locking — race conditions in token refresh are harmless
 * (worst case: two concurrent refreshes, both succeed). Just run fn()
 * directly without navigator.locks to avoid any deadlock risk.
 */
async function simpleLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  return fn()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: simpleLock,
  },
  global: {
    fetch: customFetch,
  },
})

// Initialize the cached token from the persisted session
// This runs once when the module loads
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.access_token) {
    cachedAccessToken = data.session.access_token
    console.log('🔑 Initial auth token cached')
  }
}).catch(err => {
  console.warn('⚠️ Could not get initial session:', err?.message)
})

// Keep the token updated via auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null
  if (session) {
    console.log('🔑 Auth token updated via state change')
  }
})

export function handleSupabaseError(error: any, context: string) {
  console.error(`[Supabase Error - ${context}]:`, error)
  throw new Error(`${context}: ${error.message || 'Unknown error'}`)
}
