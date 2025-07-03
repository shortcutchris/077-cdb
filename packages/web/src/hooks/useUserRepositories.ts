import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface UserRepository {
  repository_full_name: string
  repository_id: number | null
  owner: string
  name: string
  is_private: boolean
}

export function useUserRepositories() {
  const { user } = useAuth()
  const [repositories, setRepositories] = useState<UserRepository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setRepositories([])
      setLoading(false)
      return
    }

    loadUserRepositories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadUserRepositories = async () => {
    try {
      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single()

      let repos: UserRepository[] = []

      if (adminUser) {
        // Admin: Can see all repositories
        const { data, error: repoError } = await supabase
          .from('managed_repositories')
          .select(
            'repository_full_name, repository_id, owner, name, is_private'
          )
          .order('owner', { ascending: true })
          .order('name', { ascending: true })

        if (repoError) throw repoError
        repos = data || []
      } else {
        // Regular user: Only see repositories they have access to
        const { data: permissions, error: permError } = await supabase
          .from('repository_permissions')
          .select('repository_full_name')
          .eq('user_id', user!.id)
          .eq('can_create_issues', true)

        if (permError) throw permError

        if (!permissions || permissions.length === 0) {
          setRepositories([])
          setLoading(false)
          return
        }

        // Get repository details
        const repoNames = permissions.map((p) => p.repository_full_name)
        const { data, error: repoError } = await supabase
          .from('managed_repositories')
          .select(
            'repository_full_name, repository_id, owner, name, is_private'
          )
          .in('repository_full_name', repoNames)
          .order('owner', { ascending: true })
          .order('name', { ascending: true })

        if (repoError) throw repoError
        repos = data || []
      }

      setRepositories(repos)
    } catch (err) {
      console.error('Error loading user repositories:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load repositories'
      )
    } finally {
      setLoading(false)
    }
  }

  return { repositories, loading, error, reload: loadUserRepositories }
}
