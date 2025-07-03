import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface CreateIssueRequest {
  repository: string // owner/name format
  title: string
  body: string
  labels?: string[]
  assignees?: string[]
  milestone?: number
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
    const request: CreateIssueRequest = await req.json()
    const { repository, title, body, labels, assignees, milestone } = request

    if (!repository || !title || !body) {
      throw new Error('Missing required fields: repository, title, body')
    }

    // Check if user is admin
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    // If not admin, check repository permissions
    if (!adminUser) {
      const { data: permission, error: permError } = await supabaseClient
        .from('repository_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('repository_full_name', repository)
        .eq('can_create_issues', true)
        .single()

      if (permError || !permission) {
        throw new Error(
          `You don't have permission to create issues in ${repository}`
        )
      }
    }

    // Get repository details
    const { data: repo, error: repoError } = await supabaseClient
      .from('managed_repositories')
      .select('*')
      .eq('repository_full_name', repository)
      .single()

    if (repoError || !repo) {
      throw new Error(`Repository ${repository} not found in system`)
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

    // Create issue via GitHub API
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${name}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${decryptedToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'SpecifAI',
        },
        body: JSON.stringify({
          title,
          body: `${body}\n\n---\n*Created via SpecifAI Voice-to-Issue by @${user.email}*`,
          labels,
          assignees,
          milestone,
        }),
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

    const issue = await githubResponse.json()

    // Log the action
    await supabaseClient.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'issue_created',
      target_user_id: user.id,
      repository_full_name: repository,
      details: {
        issue_number: issue.number,
        issue_title: title,
        issue_url: issue.html_url,
      },
    })

    // Store issue in history (optional - for future search features)
    const { error: historyError } = await supabaseClient
      .from('issues_history')
      .insert({
        repository_full_name: repository,
        issue_number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issue.labels?.map((l: { name: string }) => l.name) || [],
        created_by: user.id,
        github_created_at: issue.created_at,
      })

    if (historyError) {
      // Don't fail if history insert fails
      console.error('Failed to store issue history:', historyError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          number: issue.number,
          title: issue.title,
          html_url: issue.html_url,
          state: issue.state,
          created_at: issue.created_at,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Create issue error:', error)
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
