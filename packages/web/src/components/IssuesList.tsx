import { useState, useEffect } from 'react'
import {
  GitPullRequest,
  GitIssueOpened,
  GitIssueClosed,
  Filter,
  RefreshCw,
  ExternalLink,
  Clock,
  Tag,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (repository) {
      loadIssues()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository])

  useEffect(() => {
    filterIssues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, filter])

  useEffect(() => {
    if (onIssueCreated) {
      // Reload issues when a new issue is created
      loadIssues()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIssueCreated])

  const loadIssues = async () => {
    if (!repository) return

    setLoading(true)
    setError(null)

    try {
      // Try using the Edge Function first
      const { data: functionData, error: functionError } =
        await supabase.functions.invoke('github-list-issues', {
          body: {
            repository,
            state: 'all',
            per_page: 100,
          },
        })

      if (functionError || !functionData?.data) {
        // Fallback to direct GitHub API for public repos
        console.warn('Edge Function not available, falling back to direct API')
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
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const data: GitHubIssue[] = await response.json()
        const issuesOnly = data.filter((item) => !item.pull_request)
        setIssues(issuesOnly)
      } else {
        setIssues(functionData.data)
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

    if (filter !== 'all') {
      filtered = filtered.filter((issue) => issue.state === filter)
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
      <GitIssueOpened className="h-5 w-5 text-green-600 dark:text-green-400" />
    ) : (
      <GitIssueClosed className="h-5 w-5 text-purple-600 dark:text-purple-400" />
    )
  }

  if (!repository) {
    return (
      <div className="text-center py-12">
        <GitIssueOpened className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Issues in {repository}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-2 rounded-lg transition-colors',
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
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              filter === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            All ({issues.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              filter === 'open'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Open ({issues.filter((i) => i.state === 'open').length})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              filter === 'closed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Closed ({issues.filter((i) => i.state === 'closed').length})
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
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
            <GitIssueOpened className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No issues found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filter === 'all'
                ? 'This repository has no issues yet'
                : `No ${filter} issues in this repository`}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIssueIcon(issue)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 dark:text-white font-medium hover:text-blue-600 dark:hover:text-blue-400 flex items-center group"
                      >
                        <span className="truncate">{issue.title}</span>
                        <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>#{issue.number}</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(issue.created_at))} ago
                        </span>
                        <span>by {issue.user.login}</span>
                      </div>
                    </div>
                  </div>

                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {issue.labels.map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `#${label.color}20`,
                            color: `#${label.color}`,
                            border: `1px solid #${label.color}40`,
                          }}
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body Preview */}
                  {issue.body && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
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
