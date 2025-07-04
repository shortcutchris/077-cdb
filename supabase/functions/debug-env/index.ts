import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check what environment variables are available
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      // Log the actual URL (without exposing keys)
      url: Deno.env.get('SUPABASE_URL'),
    }

    // Check authorization header
    const authHeader = req.headers.get('Authorization')
    const hasAuth = !!authHeader
    const authType = authHeader ? authHeader.split(' ')[0] : 'none'

    return new Response(
      JSON.stringify({
        success: true,
        env: envCheck,
        auth: {
          hasAuth,
          authType,
          headerLength: authHeader?.length || 0,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
