import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface GitHubRepository {
  id: number
  full_name: string
  name: string
  owner: {
    login: string
  }
  description: string | null
  private: boolean
  default_branch: string
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
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!adminUser) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Get active tokens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('admin_tokens')
      .select('*')
      .eq('admin_user_id', user.id)
      .eq('is_active', true)

    if (tokensError || !tokens || tokens.length === 0) {
      throw new Error('No active tokens found')
    }

    const allRepositories: GitHubRepository[] = []
    const errors: string[] = []

    // Sync repositories for each token
    for (const token of tokens) {
      try {
        // For now, tokens are stored as plain text
        // In production, use proper encryption
        const decryptedToken = token.encrypted_token

        // Fetch user repositories
        let page = 1
        let hasMore = true

        while (hasMore) {
          const response = await fetch(
            `https://api.github.com/user/repos?per_page=100&page=${page}&type=all`,
            {
              headers: {
                Authorization: `token ${decryptedToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          if (!response.ok) {
            errors.push(
              `GitHub API error for token ${token.token_name}: ${response.statusText}`
            )
            break
          }

          const repos: GitHubRepository[] = await response.json()

          if (repos.length === 0) {
            hasMore = false
          } else {
            allRepositories.push(...repos)
            page++

            // GitHub API has a rate limit, so we'll stop at 1000 repos
            if (allRepositories.length >= 1000) {
              hasMore = false
            }
          }
        }

        // Fetch organization repositories if the token has org scope
        if (token.scopes?.includes('read:org')) {
          const orgsResponse = await fetch('https://api.github.com/user/orgs', {
            headers: {
              Authorization: `token ${decryptedToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          })

          if (orgsResponse.ok) {
            const orgs = await orgsResponse.json()

            for (const org of orgs.slice(0, 10)) {
              // Limit to first 10 orgs
              let orgPage = 1
              let hasMoreOrgRepos = true

              while (hasMoreOrgRepos) {
                const orgReposResponse = await fetch(
                  `https://api.github.com/orgs/${org.login}/repos?per_page=100&page=${orgPage}`,
                  {
                    headers: {
                      Authorization: `token ${decryptedToken}`,
                      Accept: 'application/vnd.github.v3+json',
                    },
                  }
                )

                if (orgReposResponse.ok) {
                  const orgRepos: GitHubRepository[] =
                    await orgReposResponse.json()

                  if (orgRepos.length === 0) {
                    hasMoreOrgRepos = false
                  } else {
                    allRepositories.push(...orgRepos)
                    orgPage++
                  }
                } else {
                  hasMoreOrgRepos = false
                }
              }
            }
          }
        }

        // Update last used timestamp
        await supabaseClient
          .from('admin_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', token.id)
      } catch (error) {
        errors.push(
          `Error processing token ${token.token_name}: ${error.message}`
        )
      }
    }

    // Remove duplicates
    const uniqueRepos = Array.from(
      new Map(allRepositories.map((repo) => [repo.id, repo])).values()
    )

    // Upsert repositories to database
    const repoData = uniqueRepos.map((repo) => ({
      repository_full_name: repo.full_name,
      repository_id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      description: repo.description,
      is_private: repo.private,
      default_branch: repo.default_branch,
      repository_data: repo,
      last_synced_at: new Date().toISOString(),
      synced_by: user.id,
    }))

    if (repoData.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from('managed_repositories')
        .upsert(repoData, {
          onConflict: 'repository_full_name',
        })

      if (upsertError) {
        throw upsertError
      }
    }

    // Log the action
    await supabaseClient.rpc('log_admin_action', {
      action: 'repositories_synced',
      details: {
        repositories_count: uniqueRepos.length,
        errors: errors.length > 0 ? errors : null,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          synced: uniqueRepos.length,
          errors: errors.length > 0 ? errors : null,
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
