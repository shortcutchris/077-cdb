import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  GitBranch,
  CircleDot,
  CheckCircle2,
  Tag,
  MessageCircle,
  Calendar,
  AlertCircle,
  Volume2,
  Github,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AudioPlayer } from '@/components/AudioPlayer'
import { cn } from '@/lib/utils'

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
  comments: number
}

interface IssueComment {
  id: number
  body: string
  created_at: string
  updated_at: string
  user: {
    login: string
    avatar_url: string
  }
}

interface IssueHistoryData {
  audio_url: string | null
  transcription: string | null
  created_by: string
  created_at: string
}

export function IssueDetailPage() {
  const { owner, repo, issueNumber } = useParams<{
    owner: string
    repo: string
    issueNumber: string
  }>()
  const repository = owner && repo ? `${owner}/${repo}` : undefined
  const navigate = useNavigate()

  const [issue, setIssue] = useState<GitHubIssue | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [historyData, setHistoryData] = useState<IssueHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingComments, setLoadingComments] = useState(false)

  useEffect(() => {
    if (repository && issueNumber) {
      loadIssueDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, issueNumber])

  const loadIssueDetails = async () => {
    if (!repository || !issueNumber) return

    setLoading(true)
    setError(null)

    try {
      // Check user permissions first
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
        const { data: permission } = await supabase
          .from('repository_permissions')
          .select('*')
          .eq('user_id', user.id)
          .eq('repository_full_name', repository)
          .eq('is_active', true)
          .maybeSingle()

        if (!permission) {
          throw new Error("You don't have permission to view this issue")
        }
      }

      // Get GitHub token
      const { data: tokenData } = await supabase
        .from('admin_tokens')
        .select('encrypted_token')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      const [owner, repo] = repository.split('/')
      const headers: HeadersInit = {
        Accept: 'application/vnd.github.v3+json',
      }

      if (tokenData?.encrypted_token) {
        headers.Authorization = `token ${tokenData.encrypted_token}`
      }

      // Fetch issue details
      const issueResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
        { headers }
      )

      if (!issueResponse.ok) {
        if (issueResponse.status === 404) {
          throw new Error('Issue not found')
        }
        throw new Error(`Failed to load issue: ${issueResponse.status}`)
      }

      const issueData: GitHubIssue = await issueResponse.json()
      setIssue(issueData)

      // Load comments if there are any
      if (issueData.comments > 0) {
        loadComments(owner, repo, headers)
      }

      // Load history data from Supabase
      try {
        // First check if the table exists and we have access
        const issueNum = parseInt(issueNumber)

        if (!isNaN(issueNum)) {
          const { data: history, error: historyError } = await supabase
            .from('issues_history')
            .select('audio_url, transcription, created_by, created_at')
            .eq('repository_full_name', repository)
            .eq('issue_number', issueNum)
            .maybeSingle()

          if (historyError) {
            // Only log if it's not a "not found" error
            if (!historyError.message?.includes('not found')) {
              console.warn('Error loading issue history:', historyError.message)
            }
          } else if (history) {
            setHistoryData(history)
          }
        }
      } catch (historyErr) {
        // Silently ignore - history is optional
      }
    } catch (err) {
      console.error('Error loading issue:', err)
      setError(err instanceof Error ? err.message : 'Failed to load issue')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async (
    owner: string,
    repo: string,
    headers: HeadersInit
  ) => {
    setLoadingComments(true)
    try {
      const commentsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        { headers }
      )

      if (commentsResponse.ok) {
        const commentsData: IssueComment[] = await commentsResponse.json()
        setComments(commentsData)
      }
    } catch (err) {
      console.error('Error loading comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const getIssueIcon = () => {
    if (!issue) return null
    return issue.state === 'open' ? (
      <CircleDot className="h-5 w-5 text-green-600 dark:text-green-400" />
    ) : (
      <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
    )
  }

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering - could be enhanced with a proper markdown library
    return text.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h2
            key={index}
            className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white"
          >
            {line.substring(3)}
          </h2>
        )
      }
      if (line.startsWith('# ')) {
        return (
          <h1
            key={index}
            className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white"
          >
            {line.substring(2)}
          </h1>
        )
      }
      // Lists
      if (line.startsWith('- ')) {
        return (
          <li
            key={index}
            className="ml-4 list-disc text-gray-700 dark:text-gray-300"
          >
            {line.substring(2)}
          </li>
        )
      }
      // Normal paragraph
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
            {line}
          </p>
        )
      }
      return <br key={index} />
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Issue not found'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() =>
                  navigate('/', { state: { selectedRepository: repository } })
                }
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <GitBranch className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {repository}
                </span>
                <span className="text-gray-400 dark:text-gray-500">/</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  #{issueNumber}
                </span>
              </div>
            </div>
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Open in GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-start space-x-3 mb-4">
                {getIssueIcon()}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
                  {issue.title}
                </h1>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-2">
                  <img
                    src={issue.user.avatar_url}
                    alt={issue.user.login}
                    className="h-5 w-5 rounded-full"
                  />
                  <span>{issue.user.login}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    opened {formatDistanceToNow(new Date(issue.created_at))} ago
                  </span>
                </div>
                {issue.state === 'closed' && issue.closed_at && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      closed {formatDistanceToNow(new Date(issue.closed_at))}{' '}
                      ago
                    </span>
                  </div>
                )}
              </div>

              {/* Labels */}
              {issue.labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {issue.labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `#${label.color}30`,
                        color: `#${label.color}`,
                        border: `1px solid #${label.color}60`,
                      }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {label.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Body */}
              {issue.body && (
                <div className="max-w-none">{renderMarkdown(issue.body)}</div>
              )}

              {/* Audio Player if available */}
              {historyData?.audio_url && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Volume2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Original Voice Recording
                    </span>
                  </div>
                  <AudioPlayer audioUrl={historyData.audio_url} />
                  {historyData.transcription && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Transcription:</span>{' '}
                        {historyData.transcription}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                Comments ({issue.comments})
              </h2>

              {loadingComments ? (
                <div className="text-center py-8">
                  <LoadingSpinner className="h-6 w-6 mx-auto" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-l-2 border-gray-200 dark:border-gray-700 pl-4"
                    >
                      <div className="flex items-start space-x-3">
                        <img
                          src={comment.user.avatar_url}
                          alt={comment.user.login}
                          className="h-8 w-8 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {comment.user.login}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(
                                new Date(comment.created_at)
                              )}{' '}
                              ago
                            </span>
                          </div>
                          <div className="max-w-none">
                            {renderMarkdown(comment.body)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Issue Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Issue Information
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        issue.state === 'open'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      )}
                    >
                      {issue.state}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {format(new Date(issue.created_at), 'PPP')}
                  </dd>
                </div>
                {issue.updated_at !== issue.created_at && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Updated
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {format(new Date(issue.updated_at), 'PPP')}
                    </dd>
                  </div>
                )}
                {historyData && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Created via
                    </dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        SpecifAI Voice-to-Issue
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
