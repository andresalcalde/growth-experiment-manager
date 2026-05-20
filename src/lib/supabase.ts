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

/**
 * Token readiness gate.
 *
 * The cached token is populated asynchronously (getSession() below). Any query
 * that fires before that resolves would go out with only the anon key, which
 * RLS blocks → empty/broken screens that "fix themselves" on reload.
 *
 * customFetch awaits this gate so authenticated queries wait for the initial
 * token. A 2s timeout guarantees customFetch can never hang (e.g. if the
 * token endpoint itself routes through customFetch during a refresh).
 */
let tokenReady = false
let resolveTokenReady: () => void = () => {}
const tokenReadyPromise = new Promise<void>((resolve) => {
  resolveTokenReady = resolve
})

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token
}

/**
 * Custom fetch that applies the cached auth token directly.
 * This bypasses Supabase's internal fetchWithAuth → getSession() → navigator.locks chain.
 */
const customFetch: typeof fetch = async (input, init) => {
  if (!tokenReady) {
    await Promise.race([
      tokenReadyPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ])
  }

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

// Keep the token cached via auth state changes. onAuthStateChange fires an
// INITIAL_SESSION event on load (with the persisted session or null), so it
// also resolves the token-readiness gate without a separate getSession()
// call — avoiding the concurrent-getSession races that slowed init.
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null
  if (session) {
    console.log('🔑 Auth token updated via state change')
  }
  if (!tokenReady) {
    tokenReady = true
    resolveTokenReady()
  }
})

export function handleSupabaseError(error: any, context: string) {
  console.error(`[Supabase Error - ${context}]:`, error)
  throw new Error(`${context}: ${error.message || 'Unknown error'}`)
}
