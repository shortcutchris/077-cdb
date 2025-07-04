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
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    let repositories = []

    if (adminUser) {
      // Admins have access to all repositories
      const { data, error } = await supabaseClient
        .from('managed_repositories')
        .select('*')
        .order('owner')
        .order('name')

      if (error) throw error
      repositories = data || []
    } else {
      // Regular users only see repositories they have permissions for
      const { data: permissions, error: permError } = await supabaseClient
        .from('repository_permissions')
        .select(
          `
          *,
          managed_repositories!inner(*)
        `
        )
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('can_create_issues', true)

      if (permError) throw permError

      // Extract repositories from permissions
      repositories = permissions?.map((p) => p.managed_repositories) || []
    }

    // Format response
    const formattedRepos = repositories.map((repo) => ({
      repository_full_name: repo.repository_full_name,
      owner: repo.owner,
      name: repo.name,
      description: repo.description,
      is_private: repo.is_private,
      default_branch: repo.default_branch,
      last_synced_at: repo.last_synced_at,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedRepos,
        count: formattedRepos.length,
        is_admin: !!adminUser,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Get authorized repositories error:', error)
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
