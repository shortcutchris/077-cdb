import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UpdateStatusRequest {
  repository: string // owner/name format
  issueNumber: number
  status: 'open' | 'planned' | 'in-progress' | 'done'
}

const STATUS_LABELS = {
  open: {
    name: 'status:open',
    color: '0e7a0d',
    description: 'Issue is open and needs attention',
  },
  planned: {
    name: 'status:planned',
    color: '0366d6',
    description: 'Issue is planned for implementation',
  },
  'in-progress': {
    name: 'status:in-progress',
    color: 'fbca04',
    description: 'Issue is currently being worked on',
  },
  done: {
    name: 'status:done',
    color: '6f42c1',
    description: 'Issue has been completed',
  },
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request body
    let request: UpdateStatusRequest
    try {
      request = await req.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      throw new Error('Invalid request body - must be valid JSON')
    }

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

    // Extract fields from request first to check permissions
    const { repository, issueNumber, status } = request

    // Check if user is admin
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    // If not admin, check repository permissions
    if (!adminUser) {
      const { data: permission } = await supabaseClient
        .from('repository_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('repository_full_name', repository)
        .eq('is_active', true)
        .maybeSingle()

      if (!permission) {
        throw new Error(
          `You don't have permission to change status in ${repository}`
        )
      }
    }

    if (!repository || !issueNumber || !status) {
      throw new Error(
        'Missing required fields: repository, issueNumber, status'
      )
    }

    if (!STATUS_LABELS[status]) {
      throw new Error(
        'Invalid status. Must be one of: open, planned, in-progress, done'
      )
    }

    // Get repository details
    const { data: repo, error: repoError } = await supabaseClient
      .from('managed_repositories')
      .select('*')
      .eq('repository_full_name', repository)
      .maybeSingle()

    if (repoError || !repo) {
      throw new Error(`Repository ${repository} not found in system`)
    }

    // Get an admin token to use for GitHub API
    const { data: token, error: tokenError } = await supabaseClient
      .from('admin_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tokenError || !token) {
      throw new Error('No active GitHub token available')
    }

    const decryptedToken = token.encrypted_token
    const [owner, name] = repository.split('/')

    // First, ensure all status labels exist in the repository
    for (const [_statusKey, labelConfig] of Object.entries(STATUS_LABELS)) {
      try {
        // Try to create the label (will fail if it already exists, which is fine)
        await fetch(`https://api.github.com/repos/${owner}/${name}/labels`, {
          method: 'POST',
          headers: {
            Authorization: `token ${decryptedToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'SpecifAI',
          },
          body: JSON.stringify({
            name: labelConfig.name,
            color: labelConfig.color,
            description: labelConfig.description,
          }),
        })
      } catch {
        // Label already exists, that's fine
      }
    }

    // Get current issue details to preserve existing labels
    const issueResponse = await fetch(
      `https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}`,
      {
        headers: {
          Authorization: `token ${decryptedToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SpecifAI',
        },
      }
    )

    if (!issueResponse.ok) {
      throw new Error(`Failed to fetch issue: ${issueResponse.status}`)
    }

    const issue = await issueResponse.json()

    // Filter out any existing status labels and add the new one
    const existingLabels = issue.labels
      .filter((label: { name: string }) => !label.name.startsWith('status:'))
      .map((label: { name: string }) => label.name)

    const newLabels = [...existingLabels, STATUS_LABELS[status].name]

    // Update issue labels
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${decryptedToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'SpecifAI',
        },
        body: JSON.stringify({
          labels: newLabels,
          // If status is 'done', also close the issue
          state: status === 'done' ? 'closed' : 'open',
        }),
      }
    )

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json()
      throw new Error(
        `GitHub API error: ${updateResponse.status} - ${
          errorData.message || updateResponse.statusText
        }`
      )
    }

    const updatedIssue = await updateResponse.json()

    // Log the action
    await supabaseClient.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'issue_status_updated',
      target_user_id: user.id,
      repository_full_name: repository,
      details: {
        issue_number: issueNumber,
        old_status:
          existingLabels
            .find((l: string) => l.startsWith('status:'))
            ?.replace('status:', '') || 'none',
        new_status: status,
        issue_state: updatedIssue.state,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          number: updatedIssue.number,
          status: status,
          state: updatedIssue.state,
          labels: updatedIssue.labels,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Update status error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error'
    const statusCode =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage.includes('super admin')
          ? 403
          : 400

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})
