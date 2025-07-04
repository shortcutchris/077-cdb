import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface PermissionRequest {
  user_id: string
  repository_full_name: string
  can_create_issues?: boolean
  can_edit_issues?: boolean
  can_delete_issues?: boolean
}

async function requireAdmin(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: adminUser, error } = await supabaseClient
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !adminUser) {
    throw new Error('Admin access required')
  }

  return adminUser
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

    // Require admin access
    await requireAdmin(supabaseClient, user.id)

    // Handle different HTTP methods
    const url = new URL(req.url)

    switch (req.method) {
      case 'GET': {
        // List permissions
        const userId = url.searchParams.get('user_id')
        const repository = url.searchParams.get('repository')

        let query = supabaseClient.from('repository_permissions').select(`
            *,
            auth_users!repository_permissions_user_id_fkey(email)
          `)

        if (userId) {
          query = query.eq('user_id', userId)
        }
        if (repository) {
          query = query.eq('repository_full_name', repository)
        }

        const { data, error } = await query.order('created_at', {
          ascending: false,
        })

        if (error) throw error

        return new Response(
          JSON.stringify({
            success: true,
            data: data || [],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'POST': {
        // Grant permission
        const request: PermissionRequest = await req.json()
        const {
          user_id,
          repository_full_name,
          can_create_issues = true,
          can_edit_issues = false,
          can_delete_issues = false,
        } = request

        if (!user_id || !repository_full_name) {
          throw new Error(
            'Missing required fields: user_id, repository_full_name'
          )
        }

        // Check if permission already exists
        const { data: existing } = await supabaseClient
          .from('repository_permissions')
          .select('*')
          .eq('user_id', user_id)
          .eq('repository_full_name', repository_full_name)
          .single()

        if (existing) {
          // Update existing permission
          const { error: updateError } = await supabaseClient
            .from('repository_permissions')
            .update({
              can_create_issues,
              can_edit_issues,
              can_delete_issues,
              is_active: true,
              granted_by: user.id,
            })
            .eq('id', existing.id)

          if (updateError) throw updateError

          // Log the action
          await supabaseClient.from('admin_audit_log').insert({
            admin_user_id: user.id,
            action: 'permission_updated',
            target_user_id: user_id,
            repository_full_name,
            details: {
              can_create_issues,
              can_edit_issues,
              can_delete_issues,
            },
          })
        } else {
          // Create new permission
          const { error: insertError } = await supabaseClient
            .from('repository_permissions')
            .insert({
              user_id,
              repository_full_name,
              can_create_issues,
              can_edit_issues,
              can_delete_issues,
              granted_by: user.id,
              is_active: true,
            })

          if (insertError) throw insertError

          // Log the action
          await supabaseClient.from('admin_audit_log').insert({
            admin_user_id: user.id,
            action: 'permission_granted',
            target_user_id: user_id,
            repository_full_name,
            details: {
              can_create_issues,
              can_edit_issues,
              can_delete_issues,
            },
          })
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Permission granted successfully',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'DELETE': {
        // Revoke permission
        const { user_id, repository_full_name } = await req.json()

        if (!user_id || !repository_full_name) {
          throw new Error(
            'Missing required fields: user_id, repository_full_name'
          )
        }

        const { error } = await supabaseClient
          .from('repository_permissions')
          .update({ is_active: false })
          .eq('user_id', user_id)
          .eq('repository_full_name', repository_full_name)

        if (error) throw error

        // Log the action
        await supabaseClient.from('admin_audit_log').insert({
          admin_user_id: user.id,
          action: 'permission_revoked',
          target_user_id: user_id,
          repository_full_name,
        })

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Permission revoked successfully',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      default:
        throw new Error(`Method ${req.method} not allowed`)
    }
  } catch (error) {
    console.error('Permission management error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status:
          error.message === 'Unauthorized'
            ? 401
            : error.message === 'Admin access required'
              ? 403
              : 400,
      }
    )
  }
})
