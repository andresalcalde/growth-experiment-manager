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
 * Simple lock that replaces navigator.locks to prevent deadlocks.
 * navigator.locks.request() can hang indefinitely when the lock holder
 * (getSession -> token refresh -> storage) never releases, blocking
 * all subsequent Supabase calls forever.
 */
const simpleLock = async (_name: string, _mode: any, callback: any) => {
  // If called with 2 args: lock(name, callback)
  const cb = typeof _mode === 'function' ? _mode : callback
  return await cb()
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
}).finally(() => {
  tokenReady = true
  resolveTokenReady()
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
