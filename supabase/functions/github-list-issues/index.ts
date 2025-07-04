import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface ListIssuesRequest {
  repository: string // owner/name format
  state?: 'open' | 'closed' | 'all'
  labels?: string
  per_page?: number
  page?: number
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

    // Parse request
    const request: ListIssuesRequest = await req.json()
    const {
      repository,
      state = 'all',
      labels,
      per_page = 100,
      page = 1,
    } = request

    if (!repository) {
      throw new Error('Missing required field: repository')
    }

    // Check if user has permission to view this repository
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!adminUser) {
      const { data: permission, error: permError } = await supabaseClient
        .from('repository_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('repository_full_name', repository)
        .eq('is_active', true)
        .single()

      if (permError || !permission) {
        throw new Error(
          `You don't have permission to view issues in ${repository}`
        )
      }
    }

    // Get an admin token to use for GitHub API
    const { data: token, error: tokenError } = await supabaseClient
      .from('admin_tokens')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (tokenError || !token) {
      throw new Error('No active GitHub token available')
    }

    // For now, tokens are stored as plain text
    // In production, use proper encryption
    const decryptedToken = token.encrypted_token

    // Parse repository owner and name
    const [owner, name] = repository.split('/')

    // Build query parameters
    const params = new URLSearchParams({
      state,
      per_page: per_page.toString(),
      page: page.toString(),
    })

    if (labels) {
      params.append('labels', labels)
    }

    // Fetch issues from GitHub API
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${name}/issues?${params}`,
      {
        headers: {
          Authorization: `token ${decryptedToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SpecifAI',
        },
      }
    )

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json()
      throw new Error(
        `GitHub API error: ${githubResponse.status} - ${
          errorData.message || githubResponse.statusText
        }`
      )
    }

    const issues = await githubResponse.json()

    // Filter out pull requests (they appear in issues API but have pull_request property)
    const issuesOnly = issues.filter(
      (item: { pull_request?: unknown }) => !item.pull_request
    )

    // Log the action
    await supabaseClient.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'issues_listed',
      repository_full_name: repository,
      details: {
        count: issuesOnly.length,
        state,
        page,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: issuesOnly,
        pagination: {
          page,
          per_page,
          total: issuesOnly.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('List issues error:', error)
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
