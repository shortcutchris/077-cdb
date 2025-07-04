import { useState, useEffect } from 'react'
import {
  Shield,
  Check,
  X,
  Search,
  UserPlus,
  ChevronRight,
  Lock,
  Unlock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
}

interface Repository {
  repository_full_name: string
  repository_id: number | null
  owner: string
  name: string
  is_private: boolean
}

interface Permission {
  user_id: string
  repository_full_name: string
  is_active: boolean
}

export function AdminPermissionsSplitView() {
  const [users, setUsers] = useState<User[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchUser, setSearchUser] = useState('')
  const [searchRepo, setSearchRepo] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    console.log('Loading permission data...')
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load users
      const { data: usersData, error: usersError } =
        await supabase.rpc('get_all_users')

      if (usersError) {
        console.error('Error loading users:', usersError)
        throw usersError
      }

      // Load repositories
      const { data: reposData, error: reposError } = await supabase
        .from('managed_repositories')
        .select('*')
        .order('owner', { ascending: true })
        .order('name', { ascending: true })

      if (reposError) {
        console.error('Error loading repositories:', reposError)
        throw reposError
      }

      // Load permissions
      const { data: permsData, error: permsError } = await supabase
        .from('repository_permissions')
        .select('*')

      if (permsError) {
        console.error('Error loading permissions:', permsError)
        throw permsError
      }

      setUsers(usersData || [])
      setRepositories(reposData || [])
      setPermissions(permsData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = async (userId: string, repoName: string) => {
    console.log('Toggling permission for:', { userId, repoName })
    const existingPerm = permissions.find(
      (p) => p.user_id === userId && p.repository_full_name === repoName
    )

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (existingPerm) {
        // Update existing permission
        const newStatus = !existingPerm.is_active
        const { error } = await supabase
          .from('repository_permissions')
          .update({ is_active: newStatus })
          .eq('user_id', userId)
          .eq('repository_full_name', repoName)

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }

        // Update local state
        setPermissions((perms) =>
          perms.map((p) =>
            p.user_id === userId && p.repository_full_name === repoName
              ? { ...p, is_active: newStatus }
              : p
          )
        )

        setSuccess(`Permission ${newStatus ? 'granted' : 'revoked'}`)
        console.log('Permission updated successfully')
      } else {
        // Create new permission
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase.from('repository_permissions').insert({
          user_id: userId,
          repository_full_name: repoName,
          granted_by: user.id,
          is_active: true,
        })

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }

        // Update local state
        setPermissions((perms) => [
          ...perms,
          {
            user_id: userId,
            repository_full_name: repoName,
            is_active: true,
          },
        ])

        setSuccess('Permission granted')
        console.log('New permission created successfully')
      }
    } catch (err) {
      console.error('Full error details:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to update permission'
      )
    } finally {
      setSaving(false)
    }
  }

  const hasPermission = (userId: string, repoName: string) => {
    const perm = permissions.find(
      (p) => p.user_id === userId && p.repository_full_name === repoName
    )
    return perm?.is_active || false
  }

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  )

  const filteredRepos = repositories.filter((repo) =>
    repo.repository_full_name.toLowerCase().includes(searchRepo.toLowerCase())
  )

  const userPermissionCount = (userId: string) => {
    return permissions.filter((p) => p.user_id === userId && p.is_active).length
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Permission Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select a user to manage their repository access
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Split View Container */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left Side: Users */}
          <div className="border-r dark:border-gray-700">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white mb-3">
                Users
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                    selectedUser?.id === user.id &&
                      'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {userPermissionCount(user.id)} repositories
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Repositories */}
          <div>
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white mb-3">
                {selectedUser
                  ? `Repositories for ${selectedUser.email}`
                  : 'Select a user'}
              </h2>
              {selectedUser && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchRepo}
                    onChange={(e) => setSearchRepo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {selectedUser ? (
              <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.repository_full_name}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {repo.is_private ? (
                          <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Unlock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {repo.repository_full_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {repo.is_private ? 'Private' : 'Public'} repository
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        togglePermission(
                          selectedUser.id,
                          repo.repository_full_name
                        )
                      }
                      disabled={saving}
                      className={cn(
                        'inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                        hasPermission(
                          selectedUser.id,
                          repo.repository_full_name
                        )
                          ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {hasPermission(
                        selectedUser.id,
                        repo.repository_full_name
                      ) ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Shield className="mx-auto h-12 w-12 mb-4" />
                <p>Select a user to manage their repository permissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
