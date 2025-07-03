import { useState, useEffect } from 'react'
import {
  Key,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

interface AdminToken {
  id: string
  token_name: string
  github_username: string | null
  scopes: string[] | null
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
}

export function AdminTokens() {
  const [tokens, setTokens] = useState<AdminToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddToken, setShowAddToken] = useState(false)
  const [newToken, setNewToken] = useState({
    name: '',
    token: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_tokens')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTokens(data || [])
    } catch (error) {
      console.error('Error loading tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newToken.name || !newToken.token) {
      setError('Please provide both name and token')
      return
    }

    try {
      // Temporarily use direct database function instead of edge function
      const { error } = await supabase.rpc('store_admin_token', {
        p_token_name: newToken.name,
        p_token: newToken.token,
        p_github_username: 'shortcutchris',
      })

      if (error) throw error

      // Reload tokens
      await loadTokens()

      // Reset form
      setNewToken({ name: '', token: '' })
      setShowAddToken(false)
      setError(null) // Clear any previous errors
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add token')
    }
  }

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token?')) return

    try {
      const { error } = await supabase
        .from('admin_tokens')
        .update({ is_active: false })
        .eq('id', tokenId)

      if (error) throw error
      await loadTokens()
    } catch (error) {
      console.error('Error deleting token:', error)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Access Tokens</h1>
          <p className="mt-2 text-gray-600">
            Manage GitHub Personal Access Tokens for repository synchronization
          </p>
        </div>
        <button
          onClick={() => setShowAddToken(true)}
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add Token</span>
        </button>
      </div>

      {/* Add Token Form */}
      {showAddToken && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Add New Token</h2>

          <div className="mb-4 rounded-lg bg-amber-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Required GitHub Token Scopes
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <code>repo</code> - Full control of private repositories
                    </li>
                    <li>
                      <code>read:org</code> - Read organization membership
                    </li>
                  </ul>
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-amber-800 hover:text-amber-900"
                  >
                    Create token on GitHub
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddToken}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Token Name
                </label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) =>
                    setNewToken({ ...newToken, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Main Organization Token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={newToken.token}
                  onChange={(e) =>
                    setNewToken({ ...newToken, token: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="ghp_..."
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddToken(false)
                    setNewToken({ name: '', token: '' })
                    setError(null)
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Token
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tokens List */}
      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Loading tokens...</span>
              </div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12">
              <Key className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No tokens
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new Personal Access Token.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens
                .filter((t) => t.is_active)
                .map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full bg-gray-100 p-2">
                        <Key className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {token.token_name}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          {token.github_username && (
                            <span>@{token.github_username}</span>
                          )}
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Created{' '}
                            {formatDistanceToNow(
                              new Date(token.created_at)
                            )}{' '}
                            ago
                          </span>
                          {token.last_used_at && (
                            <span>
                              Last used{' '}
                              {formatDistanceToNow(
                                new Date(token.last_used_at)
                              )}{' '}
                              ago
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteToken(token.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
