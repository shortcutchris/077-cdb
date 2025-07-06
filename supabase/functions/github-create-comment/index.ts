import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface CommentRequest {
  repository: string
  issueNumber: number
  body: string
  audioUrl?: string
  transcription?: string
}

interface GitHubComment {
  id: number
  body: string
  html_url: string
  created_at: string
  user: {
    login: string
    avatar_url: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      throw new Error('Missing authorization header')
    }

    // Extract the JWT token
    const jwt = authorization.replace('Bearer ', '')

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    })

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Parse request body
    const {
      repository,
      issueNumber,
      body,
      audioUrl,
      transcription,
    }: CommentRequest = await req.json()

    // Validate required fields
    if (!repository || !issueNumber || !body) {
      throw new Error(
        'Missing required fields: repository, issueNumber, and body'
      )
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    // If not admin, check repository permission
    if (!adminUser) {
      const { data: permission } = await supabase
        .from('repository_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('repository_full_name', repository)
        .eq('is_active', true)
        .maybeSingle()

      if (!permission) {
        throw new Error(
          `No permission to create comments in repository: ${repository}`
        )
      }
    }

    // Get GitHub token from admin_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('admin_tokens')
      .select('encrypted_token')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (tokenError || !tokenData?.encrypted_token) {
      throw new Error('No GitHub token available')
    }

    // Create comment on GitHub
    const [owner, repo] = repository.split('/')
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${tokenData.encrypted_token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: body,
        }),
      }
    )

    if (!githubResponse.ok) {
      const error = await githubResponse.text()
      throw new Error(`GitHub API error: ${githubResponse.status} - ${error}`)
    }

    const githubComment: GitHubComment = await githubResponse.json()

    // Log the comment creation in audit log
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'create_comment',
      resource_type: 'github_comment',
      resource_id: githubComment.id.toString(),
      details: {
        repository,
        issueNumber,
        commentId: githubComment.id,
        hasAudio: !!audioUrl,
        hasTranscription: !!transcription,
      },
    })

    // Store comment history if audio was provided
    if (audioUrl || transcription) {
      await supabase.from('comment_history').insert({
        user_id: user.id,
        repository_full_name: repository,
        issue_number: issueNumber,
        comment_id: githubComment.id,
        github_comment_url: githubComment.html_url,
        audio_url: audioUrl || null,
        transcription: transcription || null,
        comment_body: body,
        created_at: new Date().toISOString(),
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: githubComment.id,
          html_url: githubComment.html_url,
          created_at: githubComment.created_at,
          body: githubComment.body,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error creating comment:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
