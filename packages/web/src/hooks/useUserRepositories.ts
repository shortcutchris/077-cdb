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
      // Use the RPC function that handles both admin and regular users
      const { data, error } = await supabase.rpc('get_user_repositories')

      if (error) throw error

      const repos: UserRepository[] = data || []
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
