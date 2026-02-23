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
 * This implementation uses a simple Promise-based queue with a hard timeout
 * on the ENTIRE operation (not just acquisition), preventing permanent hangs.
 */
const lockMap = new Map<string, Promise<unknown>>()

async function simpleLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const timeout = Math.max(acquireTimeout, 5000)

  // Wait for any existing lock on this name
  const existing = lockMap.get(name)
  if (existing) {
    await Promise.race([
      existing,
      new Promise(resolve => setTimeout(resolve, timeout))
    ]).catch(() => {})
  }

  // Create a new lock entry
  let releaseLock: () => void
  const lockPromise = new Promise<void>(resolve => { releaseLock = resolve })
  lockMap.set(name, lockPromise)

  try {
    // Run fn with a hard timeout to prevent permanent hangs
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Lock operation timeout: ${name}`)), timeout)
      )
    ])
    return result
  } finally {
    lockMap.delete(name)
    releaseLock!()
  }
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
