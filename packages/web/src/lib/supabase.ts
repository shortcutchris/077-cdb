import { createClient } from '@supabase/supabase-js'
import { getApiUrl } from '@/config/cors'

const supabaseUrl =
  getApiUrl() ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://uecvnenvpgvytgkzfyrh.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlY3ZuZW52cGd2eXRna3pmeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1Mjg5OTMsImV4cCI6MjA2NzEwNDk5M30.9_iumlV25O_uIl-FjlL-REH9vlApeqvdKj9Z9N00iqI'

// Configure Supabase client with CORS-friendly options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // More secure for public clients
  },
  global: {
    headers: {
      // Add any custom headers if needed
    },
  },
})
