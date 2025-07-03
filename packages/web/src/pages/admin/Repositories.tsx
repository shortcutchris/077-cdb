import { useState, useEffect } from 'react'
import {
  GitBranch,
  RefreshCw,
  Lock,
  Unlock,
  Search,
  Filter,
  AlertCircle,
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repositories</h1>
          <p className="mt-2 text-gray-600">
            Manage repositories synchronized from GitHub
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={!hasTokens || syncing}
          className={cn(
            'flex items-center space-x-2 rounded-lg px-4 py-2',
            hasTokens
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          <span>{syncing ? 'Syncing...' : 'Sync Repositories'}</span>
        </button>
      </div>

      {!hasTokens && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                No Access Tokens
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                Please add a GitHub Personal Access Token before syncing
                repositories.
              </p>
              <a
                href="/admin/tokens"
                className="text-sm text-amber-800 underline"
              >
                Go to Tokens →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search repositories..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
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
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Repositories</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>
        </div>
      </div>

      {/* Repository List */}
      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Loading repositories...</span>
              </div>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || filterPrivate !== null
                  ? 'No repositories found'
                  : 'No repositories'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasTokens
                  ? 'Click "Sync Repositories" to fetch repositories from GitHub.'
                  : 'Add a token first, then sync repositories.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRepositories.map((repo) => (
                <div
                  key={repo.repository_full_name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-gray-100 p-2">
                      {repo.is_private ? (
                        <Lock className="h-5 w-5 text-gray-600" />
                      ) : (
                        <Unlock className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {repo.repository_full_name}
                      </h3>
                      {repo.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                          {repo.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>{repo.is_private ? 'Private' : 'Public'}</span>
                        {repo.default_branch && (
                          <span>Branch: {repo.default_branch}</span>
                        )}
                        <span>
                          Synced{' '}
                          {formatDistanceToNow(new Date(repo.last_synced_at))}{' '}
                          ago
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/admin/permissions?repo=${repo.repository_full_name}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Manage Permissions →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
