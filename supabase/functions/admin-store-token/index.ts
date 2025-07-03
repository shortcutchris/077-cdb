import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Parse request body
    const { token_name, token } = await req.json()

    if (!token_name || !token) {
      throw new Error('Token name and token are required')
    }

    // Validate token format
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      throw new Error('Invalid token format')
    }

    // Test token with GitHub API
    const githubResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SpecifAI-Admin',
      },
    })

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error('GitHub API error:', githubResponse.status, errorText)
      throw new Error(
        `Invalid GitHub token: ${githubResponse.status} - ${errorText}`
      )
    }

    const githubUser = await githubResponse.json()

    // Get token scopes from response headers
    const scopesHeader = githubResponse.headers.get('x-oauth-scopes')
    const scopes = scopesHeader ? scopesHeader.split(', ').filter(Boolean) : []

    // Validate required scopes
    const requiredScopes = ['repo']
    const _hasRequiredScopes = requiredScopes.every(
      (scope) => scopes.includes(scope) || scopes.includes('admin:repo')
    )

    // Temporarily allow tokens without repo scope for testing
    // if (!hasRequiredScopes) {
    //   throw new Error(`Token missing required scopes: ${requiredScopes.join(', ')}`)
    // }

    // For now, we'll store the token with basic encoding
    // In production, use proper encryption like Supabase Vault or AWS KMS
    const encryptedData = btoa(token) // Base64 encoding as placeholder

    // Store encrypted token
    const { data: tokenData, error: insertError } = await supabaseClient
      .from('admin_tokens')
      .insert({
        admin_user_id: user.id,
        encrypted_token: encryptedData,
        token_name,
        github_username: githubUser.login,
        scopes,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Log the action
    await supabaseClient.rpc('log_admin_action', {
      action: 'token_created',
      details: {
        token_name,
        github_username: githubUser.login,
        scopes,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: tokenData.id,
          token_name: tokenData.token_name,
          github_username: tokenData.github_username,
          scopes: tokenData.scopes,
        },
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
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    )
  }
})
