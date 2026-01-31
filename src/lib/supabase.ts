import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, context: string) {
  console.error(`[Supabase Error - ${context}]:`, error)
  throw new Error(`${context}: ${error.message || 'Unknown error'}`)
}

// Test connection on module load (dev only)
if (import.meta.env.DEV) {
  supabase.from('projects').select('count').single()
    .then(() => console.log('✅ Supabase connected successfully'))
    .catch((err) => console.warn('⚠️ Supabase connection issue:', err.message))
}
