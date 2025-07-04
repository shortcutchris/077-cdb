import { useState, useEffect } from 'react'
import {
  User,
  UserCheck,
  UserX,
  Search,
  Mail,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import './admin.css'

interface UserWithPermissions {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  permissions_count: number
  is_admin: boolean
  email_confirmed_at: string | null
}

export function AdminUsers() {
  const { adminRole } = useAdmin()
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all users from the auth system using RPC function
      const { data: usersData, error: usersError } =
        await supabase.rpc('get_all_users')

      if (usersError) throw usersError

      const allUsers = usersData || []

      // Get admin users
      const { data: adminUsers } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('is_active', true)

      const adminUserIds = new Set(adminUsers?.map((a) => a.user_id) || [])

      // Get permission counts for each user
      const { data: permissionCounts } = await supabase
        .from('repository_permissions')
        .select('user_id')
        .eq('is_active', true)

      const userPermissionCounts =
        permissionCounts?.reduce(
          (acc, perm) => {
            acc[perm.user_id] = (acc[perm.user_id] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        ) || {}

      // Combine user data with permissions
      const usersWithPermissions: UserWithPermissions[] = allUsers.map(
        (user: any) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          permissions_count: userPermissionCounts[user.id] || 0,
          is_admin: adminUserIds.has(user.id),
          email_confirmed_at: user.email_confirmed_at,
        })
      )

      setUsers(usersWithPermissions)
    } catch (err) {
      console.error('Error loading users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      setInviting(true)
      setError(null)
      setSuccess(null)

      // Send magic link for authentication
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: inviteEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (authError) throw authError

      setSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')

      // Reload users after a short delay
      setTimeout(loadUsers, 1000)
    } catch (err) {
      console.error('Error inviting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const toggleAdminStatus = async (userId: string, currentIsAdmin: boolean) => {
    try {
      setError(null)
      setSuccess(null)

      if (currentIsAdmin) {
        // Remove admin status
        const { error } = await supabase
          .from('admin_users')
          .update({ is_active: false })
          .eq('user_id', userId)

        if (error) throw error

        // Log action
        await supabase.rpc('log_admin_action', {
          action: 'admin_removed',
          details: { user_id: userId },
        })

        setSuccess('Admin access removed')
      } else {
        // Add admin status
        const { error } = await supabase.from('admin_users').upsert({
          user_id: userId,
          is_active: true,
          role: 'admin',
        })

        if (error) throw error

        // Log action
        await supabase.rpc('log_admin_action', {
          action: 'admin_granted',
          details: { user_id: userId },
        })

        setSuccess('Admin access granted')
      }

      await loadUsers()
    } catch (err) {
      console.error('Error toggling admin status:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to update admin status'
      )
    }
  }

  const verifyUser = async (userId: string, userEmail: string) => {
    try {
      setError(null)
      setSuccess(null)

      const { error } = await supabase.rpc('admin_verify_user', {
        target_user_id: userId,
      })

      if (error) throw error

      setSuccess(`User ${userEmail} has been verified`)
      await loadUsers()
    } catch (err) {
      console.error('Error verifying user:', err)
      setError(err instanceof Error ? err.message : 'Failed to verify user')
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Are you sure you want to delete user ${userEmail}? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      setError(null)
      setSuccess(null)

      // Delete user permissions first
      await supabase
        .from('repository_permissions')
        .delete()
        .eq('user_id', userId)

      // Delete from admin_users if exists
      await supabase.from('admin_users').delete().eq('user_id', userId)

      // Log action
      await supabase.rpc('log_admin_action', {
        action: 'user_deleted',
        details: { user_id: userId, email: userEmail },
      })

      setSuccess('User deleted successfully')
      await loadUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage user access and permissions
        </p>
      </div>

      {/* Invite User Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
          Invite New User
        </h2>
        <form onSubmit={handleInviteUser} className="space-y-3">
          <input
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            required
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {inviting ? (
              <>
                <LoadingSpinner size="small" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Invitation
              </>
            )}
          </button>
        </form>
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

      {/* User List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>

        <div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.is_admin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                            <UserCheck className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            <User className="h-3 w-3" />
                            User
                          </span>
                        )}
                        {!user.email_confirmed_at && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                            <AlertCircle className="h-3 w-3" />
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden lg:table-cell">
                      {user.permissions_count} repositories
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!user.email_confirmed_at && (
                          <button
                            onClick={() => verifyUser(user.id, user.email)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Verify</span>
                          </button>
                        )}
                        {user.id !== adminRole?.user_id && (
                          <button
                            onClick={() =>
                              toggleAdminStatus(user.id, user.is_admin)
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg ${
                              user.is_admin
                                ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {user.is_admin ? (
                              <>
                                <UserX className="h-4 w-4" />
                                <span>Remove Admin</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4" />
                                <span>Make Admin</span>
                              </>
                            )}
                          </button>
                        )}
                        {user.id !== adminRole?.user_id && (
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1 rounded-lg text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {user.is_admin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      <UserCheck className="h-3 w-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      <User className="h-3 w-3" />
                      User
                    </span>
                  )}
                  {!user.email_confirmed_at && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                      <AlertCircle className="h-3 w-3" />
                      Unverified
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.permissions_count} repositories
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {!user.email_confirmed_at && (
                    <button
                      onClick={() => verifyUser(user.id, user.email)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verify
                    </button>
                  )}
                  {user.id !== adminRole?.user_id && (
                    <>
                      <button
                        onClick={() =>
                          toggleAdminStatus(user.id, user.is_admin)
                        }
                        className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg ${
                          user.is_admin
                            ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                            : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        {user.is_admin ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Make Admin
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchTerm
                ? 'No users found matching your search.'
                : 'No users found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
