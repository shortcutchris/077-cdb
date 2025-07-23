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
import { cn } from '@/lib/utils'
import { AudioPlayer } from '@/components/AudioPlayer'
import { CommentForm } from '@/components/CommentForm'
import { IssueStatusSelector } from '@/components/IssueStatusSelector'
import { StatusUpdateModal } from '@/components/StatusUpdateModal'
import { ISSUE_STATUSES } from '@/constants/issueStatuses'

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
  created_by: string
  created_at: string
  creator_email?: string
  // Audio data might come from a different source for voice-created issues
  audio_url?: string | null
  transcription?: string | null
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
  const [creatingComment, setCreatingComment] = useState(false)
  const [commentSuccess, setCommentSuccess] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    id: string
    email?: string
    user_metadata?: {
      user_name?: string
      preferred_username?: string
      avatar_url?: string
    }
    profile?: {
      github_username?: string
      avatar_url?: string
    }
  } | null>(null)
  const [canEditIssue, setCanEditIssue] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [statusUpdateModal, setStatusUpdateModal] = useState<{
    isOpen: boolean
    status: 'loading' | 'success' | 'error'
    message?: string
  }>({
    isOpen: false,
    status: 'loading',
  })

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

      // Store current user for later use
      setCurrentUser(user)

      // Get user profile for GitHub username
      const { data: profile } = await supabase
        .from('profiles')
        .select('github_username, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                profile,
              }
            : prev
        )
      }

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      
      // Set admin status
      setIsAdmin(!!adminUser)

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

      // Always load comments (even if counter shows 0, there might be new ones)
      loadComments(owner, repo, headers)

      // Load history data from Supabase
      try {
        // First check if the table exists and we have access
        const issueNum = parseInt(issueNumber)

        if (!isNaN(issueNum)) {
          const { data: history, error: historyError } = await supabase
            .from('issues_with_creator')
            .select('*')
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

            // Check if user can edit this issue
            // Only admins can edit issues - normal users can only view
            const canEdit = !!adminUser // Only admins can edit

            setCanEditIssue(canEdit)
          } else {
            // No history data - only admins can edit
            const canEdit = !!adminUser // Only admins can edit

            setCanEditIssue(canEdit)
          }
        }
      } catch {
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
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?t=${Date.now()}`,
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

  const handleCreateComment = async (comment: {
    body: string
    audioUrl?: string
    transcription?: string
  }) => {
    if (!repository || !issueNumber) {
      throw new Error('Repository or issue number not available')
    }

    setCreatingComment(true)
    try {
      const { data, error } = await supabase.functions.invoke(
        'github-create-comment',
        {
          body: {
            repository,
            issueNumber: parseInt(issueNumber),
            body: comment.body,
            audioUrl: comment.audioUrl,
            transcription: comment.transcription,
          },
        }
      )

      if (error) throw error

      if (data?.success) {
        // Show success message immediately
        setCommentSuccess(true)
        setTimeout(() => setCommentSuccess(false), 3000)

        // Get current user's GitHub info from profile or use fallback
        const userLogin =
          currentUser?.profile?.github_username ||
          currentUser?.user_metadata?.user_name ||
          currentUser?.user_metadata?.preferred_username ||
          currentUser?.email?.split('@')[0] ||
          'Unknown'
        const userAvatar =
          currentUser?.profile?.avatar_url ||
          currentUser?.user_metadata?.avatar_url ||
          `https://ui-avatars.com/api/?name=${userLogin}`

        // Optimistically add the new comment to the list
        const newComment: IssueComment = {
          id: data.data.id,
          body: data.data.body,
          created_at: data.data.created_at,
          updated_at: data.data.created_at,
          user: {
            login: userLogin,
            avatar_url: userAvatar,
          },
        }

        // Add to existing comments
        setComments((prev) => [...prev, newComment])

        // Update issue comment count
        setIssue((prev) =>
          prev ? { ...prev, comments: prev.comments + 1 } : prev
        )

        // Page reload not needed - optimistic updates work well
        // setTimeout(() => {
        //   window.location.reload()
        // }, 1500)
      } else {
        throw new Error(data?.error || 'Failed to create comment')
      }
    } catch (err) {
      console.error('Error creating comment:', err)
      throw err
    } finally {
      setCreatingComment(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!repository || !issueNumber) return

    setUpdatingStatus(true)
    setStatusUpdateModal({
      isOpen: true,
      status: 'loading',
      message: 'Updating issue status on GitHub...',
    })

    try {
      const { data, error } = await supabase.functions.invoke(
        'github-update-issue-status',
        {
          body: {
            repository,
            issueNumber: parseInt(issueNumber),
            status: newStatus,
          },
        }
      )

      if (error) throw error
      if (!data?.success) throw new Error('Failed to update issue status')

      // Wait for GitHub to process
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setStatusUpdateModal({
        isOpen: true,
        status: 'loading',
        message: 'Verifying status update...',
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStatusUpdateModal({
        isOpen: true,
        status: 'success',
        message: 'Issue status updated successfully!',
      })

      if (data?.success) {
        // Update issue state locally
        setIssue((prev) => {
          if (!prev) return prev

          // Update labels - remove old status label and add new one
          const newLabels = prev.labels.filter(
            (l) => !l.name.startsWith('status:')
          )
          const statusLabel = ISSUE_STATUSES.find((s) => s.value === newStatus)

          if (statusLabel) {
            newLabels.push({
              id: Date.now(), // Temporary ID
              name: `status:${newStatus}`,
              color:
                statusLabel.color === 'green'
                  ? '0e7a0d'
                  : statusLabel.color === 'blue'
                    ? '0366d6'
                    : statusLabel.color === 'yellow'
                      ? 'fbca04'
                      : '6f42c1',
            })
          }

          return {
            ...prev,
            state: newStatus === 'done' ? 'closed' : 'open',
            labels: newLabels,
          }
        })
      } else {
        throw new Error(data?.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setStatusUpdateModal({
        isOpen: true,
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to update issue status',
      })
    } finally {
      setUpdatingStatus(false)
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
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="h-full flex items-center justify-center">
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
    <div className="bg-gray-50 dark:bg-gray-900 animate-fadeIn">
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
                  <span>
                    {historyData?.created_by && historyData?.creator_email
                      ? historyData.creator_email
                      : issue.user.login}
                  </span>
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
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
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

              {/* Body */}
              {issue.body && (
                <div className="max-w-none">{renderMarkdown(issue.body)}</div>
              )}

              {/* Audio Player if available (only for issues created via voice) */}
              {historyData && historyData.audio_url && (
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

              {/* Comment Form */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Add a comment
                </h3>

                {/* Success Message */}
                {commentSuccess && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Comment posted successfully!
                    </span>
                  </div>
                )}

                <CommentForm
                  onSubmit={handleCreateComment}
                  disabled={creatingComment}
                  placeholder="Leave a comment..."
                />
              </div>
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
                  <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Status
                  </dt>
                  <dd>
                    {(() => {
                      // If issue is closed in GitHub, always show as done
                      let currentStatus = 'open'
                      
                      if (issue.state === 'closed') {
                        currentStatus = 'done'
                      } else {
                        // Extract current status from labels for open issues
                        const statusLabel = issue.labels.find((l) =>
                          l.name.startsWith('status:')
                        )
                        currentStatus = statusLabel
                          ? statusLabel.name.replace('status:', '')
                          : 'open'
                      }

                      // Only admins can change status of any issue
                      // Normal users cannot change status at all
                      return canEditIssue ? (
                        <IssueStatusSelector
                          currentStatus={currentStatus}
                          onStatusChange={handleStatusChange}
                          disabled={updatingStatus}
                        />
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2',
                            currentStatus === 'done'
                              ? 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                              : currentStatus === 'in-progress'
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                : currentStatus === 'todo'
                                  ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                  : 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          )}
                        >
                          {
                            ISSUE_STATUSES.find(
                              (s) => s.value === currentStatus
                            )?.icon
                          }
                          <span className="text-sm font-medium">
                            {ISSUE_STATUSES.find(
                              (s) => s.value === currentStatus
                            )?.label || 'Open'}
                          </span>
                        </span>
                      )
                    })()}
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
                {!canEditIssue && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Permissions
                    </dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        View only
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Only the issue creator or admins can edit
                      </p>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={statusUpdateModal.isOpen}
        status={statusUpdateModal.status}
        message={statusUpdateModal.message}
        onClose={() =>
          setStatusUpdateModal({ isOpen: false, status: 'loading' })
        }
      />
    </div>
  )
}
