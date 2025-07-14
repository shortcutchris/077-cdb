import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AlertCircle, GitBranch, ChevronDown } from 'lucide-react'
import { ISSUE_STATUSES } from '@/constants/issueStatuses'
import type { IssueStatus } from '@/components/IssueStatusSelector'
import { cn } from '@/lib/utils'

interface GitHubIssue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  repository_url: string
  labels: Array<{
    name: string
    color: string
  }>
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  repository?: {
    full_name: string
    name: string
    owner: string
  }
}

interface GroupedIssues {
  open: GitHubIssue[]
  planned: GitHubIssue[]
  'in-progress': GitHubIssue[]
  done: GitHubIssue[]
}

export function UserProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupedIssues, setGroupedIssues] = useState<GroupedIssues>({
    open: [],
    planned: [],
    'in-progress': [],
    done: [],
  })
  const [selectedStatus, setSelectedStatus] = useState<string>('open')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedRepository, setSelectedRepository] = useState<string>('all')

  // Get repositories that the current user has access to
  const loadUserRepositories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's assigned repositories
      const { data: permissions, error: permError } = await supabase
        .from('repository_permissions')
        .select('repository_full_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('revoked_at', null)

      if (permError) throw permError
      
      return permissions?.map(p => p.repository_full_name) || []
    } catch (err) {
      console.error('Error loading user repositories:', err)
      return []
    }
  }

  const loadUserIssues = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user's assigned repositories
      const userRepositories = await loadUserRepositories()
      
      if (userRepositories.length === 0) {
        setLoading(false)
        return
      }

      // Get GitHub token (using admin token for now)
      const { data: tokenData } = await supabase
        .from('admin_tokens')
        .select('encrypted_token')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (!tokenData?.encrypted_token) {
        throw new Error('No active GitHub token available')
      }

      // Fetch issues for each assigned repository
      const allIssues: GitHubIssue[] = []

      for (const repoFullName of userRepositories) {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${repoFullName}/issues?state=all&per_page=100`,
            {
              headers: {
                Authorization: `token ${tokenData.encrypted_token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          )

          if (response.ok) {
            const issues = await response.json()
            // Add repository info to each issue
            const [owner, name] = repoFullName.split('/')
            const issuesWithRepo = issues.map((issue: GitHubIssue) => ({
              ...issue,
              repository: {
                full_name: repoFullName,
                name: name,
                owner: owner,
              },
            }))
            allIssues.push(...issuesWithRepo)
          }
        } catch (err) {
          console.error(`Error fetching issues for ${repoFullName}:`, err)
        }
      }

      // Group issues by status
      const grouped: GroupedIssues = {
        open: [],
        planned: [],
        'in-progress': [],
        done: [],
      }

      allIssues.forEach((issue) => {
        const statusLabel = issue.labels.find((label) =>
          label.name.startsWith('status:')
        )

        // If no status label, default to 'open' for open issues and 'done' for closed issues
        let status: keyof GroupedIssues = 'open'

        if (statusLabel) {
          status = statusLabel.name.replace(
            'status:',
            ''
          ) as keyof GroupedIssues
        } else if (issue.state === 'closed') {
          status = 'done'
        }

        if (grouped[status]) {
          grouped[status].push(issue)
        }
      })

      setGroupedIssues(grouped)
    } catch (err) {
      console.error('Error loading issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserIssues()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      case 'planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'done':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getIconColorClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400'
      case 'blue':
        return 'text-blue-600 dark:text-blue-400'
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'purple':
        return 'text-purple-600 dark:text-purple-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const uniqueRepositories = Array.from(
    new Set(
      Object.values(groupedIssues)
        .flat()
        .map((issue) => issue.repository?.full_name)
        .filter(Boolean)
    )
  )

  const filteredIssues = (status: keyof GroupedIssues) => {
    if (selectedRepository === 'all') return groupedIssues[status]
    return groupedIssues[status].filter(
      (issue) => issue.repository?.full_name === selectedRepository
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 text-lg mb-2">
              Error loading projects
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadUserIssues}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Projects
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedRepository}
            onChange={(e) => setSelectedRepository(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
          >
            <option value="all">All Repositories</option>
            {uniqueRepositories.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ISSUE_STATUSES.map((status) => (
          <ReadOnlyColumn
            key={status.value}
            status={status}
            issues={filteredIssues(status.value as keyof GroupedIssues)}
          />
        ))}
      </div>
    </div>
  )
}

interface ReadOnlyColumnProps {
  status: IssueStatus
  issues: GitHubIssue[]
}

function ReadOnlyColumn({ status, issues }: ReadOnlyColumnProps) {
  const getHeaderColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'yellow':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'purple':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  const getIconColorClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400'
      case 'blue':
        return 'text-blue-600 dark:text-blue-400'
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'purple':
        return 'text-purple-600 dark:text-purple-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          'flex items-center justify-between p-4 border-b-2 rounded-t-lg',
          getHeaderColorClasses(status.color)
        )}
      >
        <div className="flex items-center space-x-3">
          <div className={cn('w-5 h-5', getIconColorClass(status.color))}>
            {status.icon}
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {status.label}
          </h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded">
          {issues.length}
        </span>
      </div>

      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg border-2 border-t-0 border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          {issues.map((issue) => (
            <ReadOnlyIssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ReadOnlyIssueCardProps {
  issue: GitHubIssue
}

function ReadOnlyIssueCard({ issue }: ReadOnlyIssueCardProps) {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
          {issue.title}
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
          #{issue.number}
        </span>
      </div>

      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
        <GitBranch className="w-3 h-3" />
        <span>{issue.repository?.full_name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img
            src={issue.user.avatar_url}
            alt={issue.user.login}
            className="w-4 h-4 rounded-full"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {issue.user.login}
          </span>
        </div>

        <Link
          to={`/issue/${issue.repository?.owner}/${issue.repository?.name}/${issue.number}`}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          View
        </Link>
      </div>

      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
              }}
            >
              {label.name}
            </span>
          ))}
          {issue.labels.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{issue.labels.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}