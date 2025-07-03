import { useState, useEffect } from 'react'
import { Shield, Check, X, Search, UserPlus, GitBranch } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'

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

export function AdminPermissions() {
  const [users, setUsers] = useState<User[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchUser, setSearchUser] = useState('')
  const [searchRepo, setSearchRepo] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load users
      const { data: usersData, error: usersError } =
        await supabase.rpc('get_all_users')

      if (usersError) throw usersError

      // Load repositories
      const { data: reposData, error: reposError } = await supabase
        .from('managed_repositories')
        .select('*')
        .order('owner', { ascending: true })
        .order('name', { ascending: true })

      if (reposError) throw reposError

      // Load permissions
      const { data: permsData, error: permsError } = await supabase
        .from('repository_permissions')
        .select('*')

      if (permsError) throw permsError

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

        if (error) throw error

        // Update local state
        setPermissions((perms) =>
          perms.map((p) =>
            p.user_id === userId && p.repository_full_name === repoName
              ? { ...p, is_active: newStatus }
              : p
          )
        )

        // Log action
        await supabase.rpc('log_admin_action', {
          action: newStatus ? 'permission_granted' : 'permission_revoked',
          details: { user_id: userId, repository: repoName },
        })

        setSuccess(`Permission ${newStatus ? 'granted' : 'revoked'}`)
      } else {
        // Create new permission
        const { error } = await supabase.from('repository_permissions').insert({
          user_id: userId,
          repository_full_name: repoName,
          is_active: true,
        })

        if (error) throw error

        // Update local state
        setPermissions((perms) => [
          ...perms,
          {
            user_id: userId,
            repository_full_name: repoName,
            is_active: true,
          },
        ])

        // Log action
        await supabase.rpc('log_admin_action', {
          action: 'permission_granted',
          details: { user_id: userId, repository: repoName },
        })

        setSuccess('Permission granted')
      }
    } catch (err) {
      console.error('Error toggling permission:', err)
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
        <h1 className="text-3xl font-bold text-gray-900">Permission Matrix</h1>
        <p className="mt-2 text-gray-600">
          Manage repository access permissions for users
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Repositories
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchRepo}
                onChange={(e) => setSearchRepo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {selectedUser && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-700">
              Editing permissions for:{' '}
              <strong>{users.find((u) => u.id === selectedUser)?.email}</strong>
            </span>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User / Repository
                </th>
                {filteredRepos.map((repo) => (
                  <th
                    key={repo.repository_full_name}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <GitBranch className="h-4 w-4 text-gray-400" />
                      <span className="font-normal">{repo.owner}/</span>
                      <span>{repo.name}</span>
                      {repo.is_private && (
                        <span className="text-xs text-gray-400">(Private)</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 ${selectedUser === user.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedUser(user.id)}
                >
                  <td
                    className={`sticky left-0 z-10 px-6 py-4 whitespace-nowrap ${selectedUser === user.id ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  {filteredRepos.map((repo) => (
                    <td
                      key={`${user.id}-${repo.repository_full_name}`}
                      className="px-3 py-4 whitespace-nowrap text-center"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePermission(user.id, repo.repository_full_name)
                        }}
                        disabled={saving}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          hasPermission(user.id, repo.repository_full_name)
                            ? 'bg-green-100 hover:bg-green-200 text-green-600'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {hasPermission(user.id, repo.repository_full_name) ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {(filteredUsers.length === 0 || filteredRepos.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              {filteredUsers.length === 0
                ? 'No users found matching your search.'
                : 'No repositories found matching your search.'}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex">
          <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Permission Matrix Guide
            </h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>
                • Click on any checkbox to grant or revoke repository access
              </p>
              <p>• Green checkmark = User has access to the repository</p>
              <p>• Gray X = User does not have access</p>
              <p>• Click on a user row to highlight it for easier editing</p>
              <p>• Changes are saved automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
