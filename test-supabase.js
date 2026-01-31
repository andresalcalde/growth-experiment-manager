import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yxtqzseuzablteeojaqk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dHF6c2V1emFibHRlZW9qYXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjU4MjEsImV4cCI6MjA1NDIwMTgyMX0.wGHSesm94Br3HfobCYWy5g_XrlFQ_eV'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Testing Supabase connection...')

// Test projects table
const { data, error } = await supabase.from('projects').select('*').limit(1)

if (error) {
  console.error('❌ Error:', error.message)
} else {
  console.log('✅ Connection successful!')
  console.log('Data:', data)
}
