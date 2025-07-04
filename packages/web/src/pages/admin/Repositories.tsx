import { useState, useEffect } from 'react'
import {
  GitBranch,
  RefreshCw,
  Lock,
  Unlock,
  Search,
  Filter,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Repository {
  repository_full_name: string
  repository_id: number | null
  owner: string
  name: string
  description: string | null
  is_private: boolean
  default_branch: string | null
  last_synced_at: string
  sync_error: string | null
}

export function AdminRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPrivate, setFilterPrivate] = useState<boolean | null>(null)
  const [hasTokens, setHasTokens] = useState(false)

  useEffect(() => {
    loadRepositories()
    checkTokens()
  }, [])

  const loadRepositories = async () => {
    try {
      const { data, error } = await supabase
        .from('managed_repositories')
        .select('*')
        .order('owner', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setRepositories(data || [])
    } catch (error) {
      console.error('Error loading repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkTokens = async () => {
    const { count } = await supabase
      .from('admin_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    setHasTokens((count || 0) > 0)
  }

  const handleSync = async () => {
    setSyncing(true)

    try {
      // First check if we can start sync
      const { error: checkError } = await supabase.rpc('sync_repositories')

      if (checkError) throw checkError

      // Call the Edge Function
      const { error } = await supabase.functions.invoke(
        'admin-sync-repositories',
        {
          method: 'POST',
        }
      )

      if (error) throw error

      // Debug: Sync result

      // Reload repositories
      await loadRepositories()
    } catch (error) {
      console.error('Error syncing repositories:', error)
      alert(`Error syncing repositories: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const filteredRepositories = repositories.filter((repo) => {
    const matchesSearch =
      !searchTerm ||
      repo.repository_full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (repo.description &&
        repo.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter =
      filterPrivate === null || repo.is_private === filterPrivate

    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Repositories
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage repositories synchronized from GitHub
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={!hasTokens || syncing}
          className={cn(
            'w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm sm:text-base',
            hasTokens
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          <span>{syncing ? 'Syncing...' : 'Sync Repositories'}</span>
        </button>
      </div>

      {!hasTokens && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 dark:text-amber-300 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                No Access Tokens
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Please add a GitHub Personal Access Token before syncing
                repositories.
              </p>
              <a
                href="/admin/tokens"
                className="text-sm text-amber-800 dark:text-amber-200 underline"
              >
                Go to Tokens →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search repositories..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <select
            value={
              filterPrivate === null
                ? 'all'
                : filterPrivate
                  ? 'private'
                  : 'public'
            }
            onChange={(e) => {
              const value = e.target.value
              setFilterPrivate(value === 'all' ? null : value === 'private')
            }}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Repositories</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>
        </div>
      </div>

      {/* Repository List */}
      <div className="rounded-lg bg-white dark:bg-gray-800 shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <span className="ml-2">Loading repositories...</span>
            </div>
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div className="text-center py-12 px-4">
            <GitBranch className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {searchTerm || filterPrivate !== null
                ? 'No repositories found'
                : 'No repositories'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {hasTokens
                ? 'Click "Sync Repositories" to fetch repositories from GitHub.'
                : 'Add a token first, then sync repositories.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Repository
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Synced
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRepositories.map((repo) => (
                    <tr
                      key={repo.repository_full_name}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            {repo.is_private ? (
                              <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <Unlock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {repo.repository_full_name}
                            </div>
                            {repo.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                                {repo.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          {repo.is_private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        {repo.default_branch || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(repo.last_synced_at))} ago
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={`/admin/permissions?repo=${repo.repository_full_name}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          Manage Permissions
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {filteredRepositories.map((repo) => (
                <div
                  key={repo.repository_full_name}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      {repo.is_private ? (
                        <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <Unlock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                        {repo.repository_full_name}
                      </div>
                      {repo.description && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {repo.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {repo.is_private ? 'Private' : 'Public'}
                    </span>
                    {repo.default_branch && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Branch: {repo.default_branch}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Synced{' '}
                      {formatDistanceToNow(new Date(repo.last_synced_at))} ago
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <a
                      href={`/admin/permissions?repo=${repo.repository_full_name}`}
                      className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    >
                      Manage Permissions
                      <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
