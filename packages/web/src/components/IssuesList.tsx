import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  GitPullRequest,
  CircleDot,
  CheckCircle2,
  Filter,
  RefreshCw,
  Clock,
  Tag,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  updated_at: string
  closed_at: string | null
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  pull_request?: object
}

interface IssuesListProps {
  repository: string | null
  onIssueCreated?: () => void
}

export function IssuesList({ repository, onIssueCreated }: IssuesListProps) {
  const { user } = useAuth()
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'mine'>(
    'all'
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [myIssueNumbers, setMyIssueNumbers] = useState<number[]>([])

  useEffect(() => {
    if (repository) {
      loadIssues()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository])

  useEffect(() => {
    filterIssues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, filter, myIssueNumbers])

  useEffect(() => {
    if (onIssueCreated) {
      // Add a delay to ensure GitHub API has processed the new issue
      setTimeout(() => {
        // Reload issues when a new issue is created
        loadIssues()
      }, 1500) // 1.5 second delay to give GitHub time to process
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIssueCreated])

  const loadIssues = async () => {
    if (!repository) return

    setLoading(true)
    setError(null)

    try {
      // First, check if user has permission for this repository
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      // If not admin, check specific repository permission
      if (!adminUser) {
        const { data: permission, error: permError } = await supabase
          .from('repository_permissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('repository_full_name', repository)
          .eq('is_active', true)
          .maybeSingle()

        if (permError || !permission) {
          throw new Error(
            `You don't have permission to view issues in ${repository}`
          )
        }
      }

      // Now get a GitHub token from the database
      const { data: tokenData, error: tokenError } = await supabase
        .from('admin_tokens')
        .select('encrypted_token')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (tokenError || !tokenData) {
        // Try public API as fallback
        const [owner, repo] = repository.split('/')

        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        )

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              'Repository not found or is private. GitHub authentication required.'
            )
          }
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const data: GitHubIssue[] = await response.json()
        const issuesOnly = data.filter((item) => !item.pull_request)
        setIssues(issuesOnly)
      } else {
        // Use token to access private repositories
        const [owner, repo] = repository.split('/')
        const token = tokenData.encrypted_token

        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `token ${token}`,
            },
          }
        )

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Repository not found or you don't have access.")
          }
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const data: GitHubIssue[] = await response.json()
        const issuesOnly = data.filter((item) => !item.pull_request)
        setIssues(issuesOnly)
      }

      // Load user's created issues from Supabase
      if (user) {
        const { data: userIssues, error: historyError } = await supabase
          .from('issues_history')
          .select('issue_number')
          .eq('repository_full_name', repository)
          .eq('created_by', user.id)

        if (!historyError && userIssues) {
          setMyIssueNumbers(userIssues.map((item) => item.issue_number))
        }
      }
    } catch (err) {
      console.error('Error loading issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load issues')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const filterIssues = () => {
    let filtered = [...issues]

    if (filter === 'open' || filter === 'closed') {
      filtered = filtered.filter((issue) => issue.state === filter)
    } else if (filter === 'mine') {
      // Hybrid approach: Check both Supabase history and GitHub username
      const githubUsername =
        user?.user_metadata?.user_name ||
        user?.user_metadata?.preferred_username

      filtered = filtered.filter((issue) => {
        // Check if issue was created by user via SpecifAI (in Supabase)
        if (myIssueNumbers.includes(issue.number)) {
          return true
        }
        // Also check if created directly on GitHub
        if (githubUsername && issue.user.login === githubUsername) {
          return true
        }
        return false
      })
    }

    // Sort by created date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setFilteredIssues(filtered)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadIssues()
  }

  const getIssueIcon = (issue: GitHubIssue) => {
    if (issue.pull_request) {
      return <GitPullRequest className="h-5 w-5" />
    }
    return issue.state === 'open' ? (
      <CircleDot className="h-5 w-5 text-green-600 dark:text-green-400" />
    ) : (
      <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
    )
  }

  if (!repository) {
    return (
      <div className="text-center py-12">
        <CircleDot className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No repository selected
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select a repository to view its issues
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          Issues in {repository}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-2 rounded-lg transition-colors flex-shrink-0',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw
            className={cn(
              'h-4 w-4 text-gray-600 dark:text-gray-400',
              isRefreshing && 'animate-spin'
            )}
          />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                filter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">All ({issues.length})</span>
            </button>
            <button
              onClick={() => setFilter('open')}
              className={cn(
                'px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                filter === 'open'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <span className="sm:hidden">Open</span>
              <span className="hidden sm:inline">
                Open ({issues.filter((i) => i.state === 'open').length})
              </span>
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={cn(
                'px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                filter === 'closed'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <span className="sm:hidden">Closed</span>
              <span className="hidden sm:inline">
                Closed ({issues.filter((i) => i.state === 'closed').length})
              </span>
            </button>
            <button
              onClick={() => setFilter('mine')}
              className={cn(
                'px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                filter === 'mine'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <span className="sm:hidden">Mine</span>
              <span className="hidden sm:inline">
                My Issues (
                {(() => {
                  const githubUsername =
                    user?.user_metadata?.user_name ||
                    user?.user_metadata?.preferred_username

                  // Count issues created by user (hybrid approach)
                  return issues.filter((issue) => {
                    // Check Supabase history
                    if (myIssueNumbers.includes(issue.number)) return true
                    // Check GitHub username
                    if (githubUsername && issue.user.login === githubUsername)
                      return true
                    return false
                  }).length
                })()}
                )
              </span>
            </button>
          </div>
        </div>
        {/* Count Display - Mobile only */}
        {!loading && !error && (
          <div className="sm:hidden text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0 ml-2">
            {filteredIssues.length}/{issues.length}
          </div>
        )}
      </div>

      {/* Issues List - Scrollable Container */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <span className="ml-2">Loading issues...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              Error loading issues
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-12">
            <CircleDot className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No issues found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filter === 'all'
                ? 'This repository has no issues yet'
                : filter === 'mine'
                  ? 'You have not created any issues in this repository'
                  : `No ${filter} issues in this repository`}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-3 sm:p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIssueIcon(issue)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="space-y-1">
                    <Link
                      to={`/issue/${repository.split('/')[0]}/${repository.split('/')[1]}/${issue.number}`}
                      className="text-gray-900 dark:text-white font-medium hover:text-blue-600 dark:hover:text-blue-400 block"
                    >
                      <span className="line-clamp-2 break-words">
                        {issue.title}
                      </span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span>#{issue.number}</span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(issue.created_at))} ago
                      </span>
                      <span className="hidden sm:inline">
                        by {issue.user.login}
                      </span>
                    </div>
                  </div>

                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {issue.labels.map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                          style={{
                            // Light mode: Use a light tint of the color with black text
                            backgroundColor: `#${label.color}20`,
                            color: '#000000',
                            border: `2px solid #${label.color}`,
                          }}
                        >
                          <style
                            dangerouslySetInnerHTML={{
                              __html: `
                              .dark span[data-label-id="${label.id}"] {
                                background-color: #${label.color}30 !important;
                                color: #${label.color} !important;
                                border: 1px solid #${label.color}60 !important;
                              }
                            `,
                            }}
                          />
                          <span data-label-id={label.id} className="contents">
                            <Tag className="h-3 w-3 mr-1" />
                            {label.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body Preview - Hidden on mobile */}
                  {issue.body && (
                    <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 hidden sm:block">
                      {issue.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
