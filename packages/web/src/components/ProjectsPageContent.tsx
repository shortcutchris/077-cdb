import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AlertCircle, GitBranch, ChevronDown, Plus } from 'lucide-react'
import { ISSUE_STATUSES } from '@/constants/issueStatuses'
import { cn } from '@/lib/utils'
import { CreateIssueModal } from '@/components/CreateIssueModal'
import { StatusUpdateModal } from '@/components/StatusUpdateModal'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '@/contexts/AuthContext'

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
  assignees?: Array<{
    login: string
  }>
  isCreatedByUser?: boolean
  creatorEmail?: string
  creatorName?: string
}

interface GroupedIssues {
  open: GitHubIssue[]
  planned: GitHubIssue[]
  'in-progress': GitHubIssue[]
  done: GitHubIssue[]
}

interface ProjectsPageContentProps {
  isReadOnly?: boolean
  userView?: boolean
}

export function ProjectsPageContent({
  isReadOnly = false,
  userView = false,
}: ProjectsPageContentProps) {
  const { user } = useAuth()
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
  const [updatingIssue, setUpdatingIssue] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedRepository, setSelectedRepository] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [issueFilter, setIssueFilter] = useState<'all' | 'mine'>('all')
  const [statusUpdateModal, setStatusUpdateModal] = useState<{
    isOpen: boolean
    status: 'loading' | 'success' | 'error'
    message?: string
  }>({
    isOpen: false,
    status: 'loading',
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  )

  // Custom collision detection that prioritizes columns
  const collisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
    // First try to find collisions with columns
    const columnContainers = args.droppableContainers.filter((container) =>
      container.id.toString().startsWith('column-')
    )

    // Use a more generous collision detection for columns
    const collisions = []

    if (args.pointerCoordinates) {
      for (const container of columnContainers) {
        const rect = container.rect.current
        if (!rect) continue

        const { x, y } = args.pointerCoordinates

        // Check if pointer is within the column bounds with some padding
        const padding = 20
        if (
          x >= rect.left - padding &&
          x <= rect.right + padding &&
          y >= rect.top - padding &&
          y <= rect.bottom + padding
        ) {
          collisions.push({
            id: container.id,
            data: { droppableContainer: container },
          })
        }
      }
    }

    // If we found column collisions, return the closest one
    if (collisions.length > 0) {
      return collisions
    }

    // Otherwise fall back to rect intersection for sortable items
    return rectIntersection(args)
  }

  useEffect(() => {
    if (!user) return // Don't load if user is not available yet
    loadAllIssues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userView, user])

  const loadAllIssues = async () => {
    try {
      setLoading(true)
      setError(null)

      if (userView && user) {
        // For normal users, load issues from permitted repositories

        // Get repositories the user has access to
        const { data: permissions, error: permError } = await supabase
          .from('repository_permissions')
          .select('repository_full_name')
          .eq('user_id', user.id)

        if (permError) {
          console.error('Permission query error:', permError)
          throw permError
        }

        if (!permissions || permissions.length === 0) {
          setLoading(false)
          setError(
            'Keine Repositories freigeschaltet. Bitte wenden Sie sich an einen Administrator.'
          )
          return
        }

        // Get repository details for permitted repos
        const permittedRepoNames = permissions.map(
          (p) => p.repository_full_name
        )

        const { data: repositories, error: repoError } = await supabase
          .from('managed_repositories')
          .select('repository_full_name, owner, name')
          .in('repository_full_name', permittedRepoNames)

        if (repoError) {
          console.error('Repository query error:', repoError)
          throw repoError
        }
        if (!repositories || repositories.length === 0) {
          setLoading(false)
          return
        }

        // Get GitHub token
        const { data: tokenData } = await supabase
          .from('admin_tokens')
          .select('encrypted_token')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (!tokenData?.encrypted_token) {
          console.error('No active GitHub token found')
          throw new Error('No active GitHub token available')
        }

        // Get issues with creator information
        const { data: issuesWithCreators } = await supabase
          .from('issues_with_creator')
          .select(
            'repository_full_name, issue_number, creator_email, creator_name, created_by'
          )
          .in('repository_full_name', permittedRepoNames)

        // Create maps for quick lookup
        const createdByUser = new Set(
          issuesWithCreators
            ?.filter((i) => i.created_by === user.id)
            .map((i) => `${i.repository_full_name}#${i.issue_number}`) || []
        )

        const creatorInfo = new Map(
          issuesWithCreators?.map((i) => [
            `${i.repository_full_name}#${i.issue_number}`,
            {
              email: i.creator_email,
              name: i.creator_name,
            },
          ]) || []
        )

        // Fetch issues for each repository
        const allIssues: GitHubIssue[] = []

        for (const repo of repositories) {
          try {
            // Fetch ALL issues from permitted repositories (not filtered by assignee)
            const response = await fetch(
              `https://api.github.com/repos/${repo.repository_full_name}/issues?state=all&per_page=100`,
              {
                headers: {
                  Authorization: `token ${tokenData.encrypted_token}`,
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            )

            if (response.ok) {
              const issues = await response.json()
              // Add repository info, created-by-user flag, and creator info to each issue
              const issuesWithRepo = issues.map((issue: GitHubIssue) => {
                const issueKey = `${repo.repository_full_name}#${issue.number}`
                const creator = creatorInfo.get(issueKey)
                return {
                  ...issue,
                  repository: {
                    full_name: repo.repository_full_name,
                    name: repo.name,
                    owner: repo.owner,
                  },
                  isCreatedByUser: createdByUser.has(issueKey),
                  creatorEmail: creator?.email,
                  creatorName: creator?.name,
                }
              })
              allIssues.push(...issuesWithRepo)
            }
          } catch (err) {
            console.error(
              `Error fetching issues for ${repo.repository_full_name}:`,
              err
            )
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
      } else if (!userView) {
        // Admin view - load all issues
        // Get all managed repositories
        const { data: repositories, error: repoError } = await supabase
          .from('managed_repositories')
          .select('repository_full_name, owner, name')

        if (repoError) throw repoError
        if (!repositories || repositories.length === 0) {
          setLoading(false)
          return
        }

        // Get GitHub token
        const { data: tokenData } = await supabase
          .from('admin_tokens')
          .select('encrypted_token')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (!tokenData?.encrypted_token) {
          throw new Error('No active GitHub token available')
        }

        // Get all issues created by users (for admin view)
        const { data: allUserCreated } = await supabase
          .from('issues_history')
          .select('repository_full_name, issue_number, created_by')

        // Create a Set for quick lookup
        const createdIssuesMap = new Set(
          allUserCreated?.map(
            (i) => `${i.repository_full_name}#${i.issue_number}`
          ) || []
        )

        // Fetch issues for each repository
        const allIssues: GitHubIssue[] = []

        for (const repo of repositories) {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${repo.repository_full_name}/issues?state=all&per_page=100`,
              {
                headers: {
                  Authorization: `token ${tokenData.encrypted_token}`,
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            )

            if (response.ok) {
              const issues = await response.json()
              // Add repository info and created-by-user flag to each issue
              const issuesWithRepo = issues.map((issue: GitHubIssue) => ({
                ...issue,
                repository: {
                  full_name: repo.repository_full_name,
                  name: repo.name,
                  owner: repo.owner,
                },
                isCreatedByUser: createdIssuesMap.has(
                  `${repo.repository_full_name}#${issue.number}`
                ),
              }))
              allIssues.push(...issuesWithRepo)
            }
          } catch (err) {
            console.error(
              `Error fetching issues for ${repo.repository_full_name}:`,
              err
            )
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
      }
    } catch (err) {
      console.error('=== DEBUG: Error loading issues ===')
      console.error('Error details:', err)
      console.error('Error type:', err?.constructor?.name)
      if (err instanceof Error) {
        console.error('Error message:', err.message)
        console.error('Error stack:', err.stack)
        setError(err.message)
      } else if (err && typeof err === 'object') {
        console.error('Error object:', JSON.stringify(err, null, 2))
        setError(err.message || err.error || 'Failed to load issues')
      } else {
        console.error('Unknown error:', String(err))
        setError('Failed to load issues')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isReadOnly) return

    const { active, over } = event
    setActiveId(null)

    if (!over) {
      return
    }

    // Find the issue that was dragged
    const draggedIssue = Object.values(groupedIssues)
      .flat()
      .find((issue) => issue.id === active.id)

    if (!draggedIssue) {
      return
    }

    // Determine the target status
    let targetStatus: string | null = null

    // Check if we dropped on a column directly
    const overId = over.id as string
    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '')
    } else if (over.data?.current?.type === 'column') {
      // Check if the over data indicates a column
      targetStatus = over.data.current.status
    } else {
      // If we dropped on an issue, find its parent column
      for (const [status, issues] of Object.entries(groupedIssues)) {
        if (issues.some((issue) => issue.id === over.id)) {
          targetStatus = status
          break
        }
      }
    }

    if (!targetStatus) {
      return
    }

    // Get current status from labels
    const currentStatusLabel = draggedIssue.labels.find((l: { name: string }) =>
      l.name.startsWith('status:')
    )
    const currentStatus =
      currentStatusLabel?.name.replace('status:', '') || 'open'

    // If status hasn't changed, do nothing
    if (currentStatus === targetStatus) {
      return
    }

    // OPTIMISTIC UPDATE - Move issue immediately for better UX
    const oldStatus = currentStatus as keyof GroupedIssues
    const newStatus = targetStatus as keyof GroupedIssues

    // Create updated issue with new status
    const updatedIssue = {
      ...draggedIssue,
      labels: [
        ...draggedIssue.labels.filter(
          (l: { name: string }) => !l.name.startsWith('status:')
        ),
        {
          name: `status:${targetStatus}`,
          color: getStatusColor(targetStatus),
        },
      ],
      state: targetStatus === 'done' ? ('closed' as const) : ('open' as const),
    }

    // Update state optimistically
    setGroupedIssues((prev) => {
      const newGrouped = { ...prev }
      // Remove from old column
      newGrouped[oldStatus] = newGrouped[oldStatus].filter(
        (i) => i.id !== draggedIssue.id
      )
      // Add to new column
      newGrouped[newStatus] = [...newGrouped[newStatus], updatedIssue]
      return newGrouped
    })

    // Update the issue status on server
    try {
      await handleStatusChange(
        draggedIssue.id,
        draggedIssue.repository!.full_name,
        draggedIssue.number,
        targetStatus,
        false // Don't update UI again
      )
    } catch {
      // Revert on error
      setGroupedIssues((prev) => {
        const newGrouped = { ...prev }
        // Remove from new column
        newGrouped[newStatus] = newGrouped[newStatus].filter(
          (i) => i.id !== draggedIssue.id
        )
        // Add back to old column
        newGrouped[oldStatus] = [...newGrouped[oldStatus], draggedIssue]
        return newGrouped
      })
    }
  }

  const handleStatusChange = async (
    issueId: number,
    repository: string,
    issueNumber: number,
    newStatus: string,
    updateUI: boolean = true
  ) => {
    if (isReadOnly) return

    setUpdatingIssue(issueId)
    setStatusUpdateModal({
      isOpen: true,
      status: 'loading',
      message: 'Updating issue status on GitHub...',
    })

    try {
      // Step 1: Update via Edge Function
      const { data } = await supabase.functions.invoke(
        'github-update-issue-status',
        {
          body: {
            repository,
            issueNumber,
            status: newStatus,
          },
        }
      )

      if (!data?.success) throw new Error('Failed to update issue status')

      // Step 2: Wait a bit for GitHub to process
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Step 3: Verify the update
      setStatusUpdateModal({
        isOpen: true,
        status: 'loading',
        message: 'Verifying status update...',
      })

      // Wait a bit more to ensure GitHub has processed the change
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success
      setStatusUpdateModal({
        isOpen: true,
        status: 'success',
        message: 'Issue status updated successfully!',
      })

      if (data?.success && updateUI) {
        // Only update UI if requested (not for drag & drop)
        // Move issue to new status group
        const issue = Object.values(groupedIssues)
          .flat()
          .find((i) => i.id === issueId)

        if (issue) {
          // Remove from old status
          const oldStatus = issue.labels
            .find((l: { name: string }) => l.name.startsWith('status:'))
            ?.name.replace('status:', '') as keyof GroupedIssues

          if (oldStatus && oldStatus !== newStatus) {
            setGroupedIssues((prev) => {
              const newGrouped = { ...prev }
              newGrouped[oldStatus] = newGrouped[oldStatus].filter(
                (i) => i.id !== issueId
              )

              // Update issue labels
              const updatedIssue = {
                ...issue,
                labels: [
                  ...issue.labels.filter(
                    (l: { name: string }) => !l.name.startsWith('status:')
                  ),
                  {
                    name: `status:${newStatus}`,
                    color: getStatusColor(newStatus),
                  },
                ],
                state:
                  newStatus === 'done'
                    ? ('closed' as const)
                    : ('open' as const),
              }

              newGrouped[newStatus as keyof GroupedIssues].push(updatedIssue)
              return newGrouped
            })
          }
        }
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setStatusUpdateModal({
        isOpen: true,
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to update issue status',
      })
      // Issue-Liste neu laden bei Fehler
      await loadAllIssues()
    } finally {
      setUpdatingIssue(null)
    }
  }

  const getStatusColor = (status: string) => {
    const statusConfig = ISSUE_STATUSES.find((s) => s.value === status)
    return statusConfig?.color === 'green'
      ? '0e7a0d'
      : statusConfig?.color === 'blue'
        ? '0366d6'
        : statusConfig?.color === 'yellow'
          ? 'fbca04'
          : '6f42c1'
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

  // Extract unique repositories from all issues
  const repositories = useMemo(() => {
    const repoSet = new Set<string>()
    Object.values(groupedIssues)
      .flat()
      .forEach((issue) => {
        if (issue.repository?.full_name) {
          repoSet.add(issue.repository.full_name)
        }
      })
    return Array.from(repoSet).sort()
  }, [groupedIssues])

  // Filter issues based on selected repository AND issue filter (all/mine)
  const displayedIssues = useMemo(() => {
    let filteredByRepo = groupedIssues

    // First filter by repository if needed
    if (selectedRepository !== 'all') {
      filteredByRepo = {
        open: groupedIssues.open.filter(
          (i) => i.repository?.full_name === selectedRepository
        ),
        planned: groupedIssues.planned.filter(
          (i) => i.repository?.full_name === selectedRepository
        ),
        'in-progress': groupedIssues['in-progress'].filter(
          (i) => i.repository?.full_name === selectedRepository
        ),
        done: groupedIssues.done.filter(
          (i) => i.repository?.full_name === selectedRepository
        ),
      }
    }

    // Then filter by issue type if viewing "mine" only
    if (issueFilter === 'mine' && userView) {
      return {
        open: filteredByRepo.open.filter((i) => i.isCreatedByUser),
        planned: filteredByRepo.planned.filter((i) => i.isCreatedByUser),
        'in-progress': filteredByRepo['in-progress'].filter(
          (i) => i.isCreatedByUser
        ),
        done: filteredByRepo.done.filter((i) => i.isCreatedByUser),
      }
    }

    return filteredByRepo
  }, [groupedIssues, selectedRepository, issueFilter, userView])

  const totalIssues = Object.values(groupedIssues).reduce(
    (sum, issues) => sum + issues.length,
    0
  )

  // Count issues for current view
  const displayedIssuesCount = Object.values(displayedIssues).reduce(
    (sum, issues) => sum + issues.length,
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error loading issues
        </p>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    )
  }

  const pageTitle = userView ? 'My Projects' : 'Projects Overview'
  const pageDescription = userView
    ? 'View your assigned issues across all repositories'
    : 'Manage all issues across your repositories'

  const renderContent = () => {
    if (isReadOnly) {
      // Read-only view for normal users
      return (
        <>
          {/* Mobile Status Selector */}
          <div className="md:hidden mb-6">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'text-lg',
                      getIconColorClass(
                        ISSUE_STATUSES.find((s) => s.value === selectedStatus)
                          ?.color || ''
                      )
                    )}
                  >
                    {
                      ISSUE_STATUSES.find((s) => s.value === selectedStatus)
                        ?.icon
                    }
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {
                      ISSUE_STATUSES.find((s) => s.value === selectedStatus)
                        ?.label
                    }
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {
                      displayedIssues[selectedStatus as keyof GroupedIssues]
                        .length
                    }
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 transition-transform text-gray-500',
                    isDropdownOpen && 'rotate-180'
                  )}
                />
              </button>

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    {ISSUE_STATUSES.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => {
                          setSelectedStatus(status.value)
                          setIsDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100',
                          status.value === selectedStatus &&
                            'bg-gray-50 dark:bg-gray-700'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={getIconColorClass(status.color)}>
                            {status.icon}
                          </span>
                          <span>{status.label}</span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {
                            displayedIssues[status.value as keyof GroupedIssues]
                              .length
                          }
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Kanban View - Read Only */}
          <div className="hidden md:block">
            <div
              className="grid grid-cols-4 gap-6"
              style={{ height: 'calc(100vh - 16rem)' }}
            >
              {ISSUE_STATUSES.map((status) => (
                <ReadOnlyColumn
                  key={status.value}
                  status={status}
                  issues={displayedIssues[status.value as keyof GroupedIssues]}
                  onCreateIssue={
                    status.value === 'open'
                      ? () => setIsCreateModalOpen(true)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-3">
            {displayedIssues[selectedStatus as keyof GroupedIssues].length ===
            0 ? (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No issues in{' '}
                  {ISSUE_STATUSES.find(
                    (s) => s.value === selectedStatus
                  )?.label.toLowerCase()}
                </p>
              </div>
            ) : (
              displayedIssues[selectedStatus as keyof GroupedIssues].map(
                (issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isUpdating={false}
                    showStatusChanger={false}
                  />
                )
              )
            )}
          </div>
        </>
      )
    }

    // Admin view with drag & drop
    return (
      <>
        {/* Mobile Status Selector */}
        <div className="md:hidden mb-6">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-lg',
                    getIconColorClass(
                      ISSUE_STATUSES.find((s) => s.value === selectedStatus)
                        ?.color || ''
                    )
                  )}
                >
                  {ISSUE_STATUSES.find((s) => s.value === selectedStatus)?.icon}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {
                    ISSUE_STATUSES.find((s) => s.value === selectedStatus)
                      ?.label
                  }
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {
                    displayedIssues[selectedStatus as keyof GroupedIssues]
                      .length
                  }
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 transition-transform text-gray-500',
                  isDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  {ISSUE_STATUSES.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => {
                        setSelectedStatus(status.value)
                        setIsDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100',
                        status.value === selectedStatus &&
                          'bg-gray-50 dark:bg-gray-700'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={getIconColorClass(status.color)}>
                          {status.icon}
                        </span>
                        <span>{status.label}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {
                          displayedIssues[status.value as keyof GroupedIssues]
                            .length
                        }
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop Kanban View */}
        <div className="hidden md:flex flex-col h-full">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-4 gap-6 h-full">
              {ISSUE_STATUSES.map((status) => (
                <DroppableColumn
                  key={status.value}
                  status={status}
                  issues={displayedIssues[status.value as keyof GroupedIssues]}
                  updatingIssue={updatingIssue}
                  onCreateIssue={
                    status.value === 'open'
                      ? () => setIsCreateModalOpen(true)
                      : undefined
                  }
                />
              ))}
            </div>
            <DragOverlay
              dropAnimation={null} // Deaktiviert die Drop-Animation
            >
              {activeId ? (
                <div className="transform rotate-2 opacity-95">
                  <IssueCard
                    issue={
                      Object.values(displayedIssues)
                        .flat()
                        .find((i) => i.id === activeId)!
                    }
                    isUpdating={false}
                    isDragging
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-3">
          {displayedIssues[selectedStatus as keyof GroupedIssues].length ===
          0 ? (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No issues in{' '}
                {ISSUE_STATUSES.find(
                  (s) => s.value === selectedStatus
                )?.label.toLowerCase()}
              </p>
            </div>
          ) : (
            displayedIssues[selectedStatus as keyof GroupedIssues].map(
              (issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onStatusChange={(newStatus) =>
                    handleStatusChange(
                      issue.id,
                      issue.repository!.full_name,
                      issue.number,
                      newStatus
                    )
                  }
                  isUpdating={updatingIssue === issue.id}
                  showStatusChanger
                />
              )
            )
          )}
        </div>
      </>
    )
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 p-8 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <div className="mb-8 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {pageTitle}
                </h1>
                <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                  {pageDescription}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {repositories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="repo-filter"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Repository:
                    </label>
                    <select
                      id="repo-filter"
                      value={selectedRepository}
                      onChange={(e) => setSelectedRepository(e.target.value)}
                      className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="all">
                        Alle Repositories ({totalIssues})
                      </option>
                      {repositories.map((repo) => {
                        const repoIssueCount = Object.values(groupedIssues)
                          .flat()
                          .filter(
                            (issue) => issue.repository?.full_name === repo
                          ).length
                        return (
                          <option key={repo} value={repo}>
                            {repo} ({repoIssueCount})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )}

                {userView && (
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setIssueFilter('all')}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                        issueFilter === 'all'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                      )}
                    >
                      All Issues
                    </button>
                    <button
                      onClick={() => setIssueFilter('mine')}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 -ml-px',
                        issueFilter === 'mine'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                      )}
                    >
                      My Issues (
                      {
                        Object.values(groupedIssues)
                          .flat()
                          .filter((i) => i.isCreatedByUser).length
                      }
                      )
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {displayedIssuesCount === 0 && selectedRepository !== 'all' ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No issues in {selectedRepository}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {userView
                    ? "You don't have any assigned issues in this repository."
                    : "This repository doesn't have any issues yet."}
                </p>
              </div>
            </div>
          ) : totalIssues === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No issues found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {userView
                    ? "You don't have any assigned issues yet."
                    : "Your repositories don't have any issues yet. Create your first issue to see it here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">{renderContent()}</div>
          )}

          {/* Create Issue Modal */}
          {
            <CreateIssueModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              initialRepository={
                selectedRepository === 'all'
                  ? repositories.length > 0
                    ? repositories[0]
                    : ''
                  : selectedRepository
              }
              onIssueCreated={() => {
                // Wait a bit for GitHub to process the new issue
                setTimeout(() => {
                  loadAllIssues()
                }, 1500)
              }}
            />
          }
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

// Read-only column component for normal users
interface ReadOnlyColumnProps {
  status: (typeof ISSUE_STATUSES)[0]
  issues: GitHubIssue[]
  onCreateIssue?: () => void
}

function ReadOnlyColumn({
  status,
  issues,
  onCreateIssue,
}: ReadOnlyColumnProps) {
  const getHeaderColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100'
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100'
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100'
      default:
        return 'bg-gray-100 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div
      className="bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col h-full"
      style={{ minHeight: '400px' }}
    >
      <div
        className={cn('p-4 rounded-t-xl', getHeaderColorClasses(status.color))}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="opacity-75">{status.icon}</span>
            <h3 className="font-semibold text-lg">{status.label}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium bg-white/20 dark:bg-black/20 px-2 py-1 rounded-full">
              {issues.length}
            </span>
            {onCreateIssue && (
              <button
                onClick={onCreateIssue}
                className="p-1.5 rounded-full bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                title="Create new issue"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-50 dark:bg-gray-900/30 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
              No issues
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} isUpdating={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface DroppableColumnProps {
  status: (typeof ISSUE_STATUSES)[0]
  issues: GitHubIssue[]
  updatingIssue: number | null
  onCreateIssue?: () => void
}

function DroppableColumn({
  status,
  issues,
  updatingIssue,
  onCreateIssue,
}: DroppableColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `column-${status.value}`,
    data: {
      type: 'column',
      status: status.value,
    },
  })

  // Get the active issue from the drag data
  const activeIssue = active?.data?.current?.issue as GitHubIssue | undefined

  // Determine which column the dragged issue currently belongs to
  let activeIssueStatus = 'open' // default
  if (activeIssue) {
    const statusLabel = activeIssue.labels?.find((l: { name: string }) =>
      l.name.startsWith('status:')
    )
    if (statusLabel) {
      activeIssueStatus = statusLabel.name.replace('status:', '')
    } else if (activeIssue.state === 'closed') {
      // If no status label but issue is closed, it's in 'done'
      activeIssueStatus = 'done'
    }
  }

  // Check if the active issue belongs to this column
  const isDraggingFromThisColumn = active && activeIssueStatus === status.value

  // Only highlight if we're hovering over a different column
  const shouldHighlight = isOver && active && !isDraggingFromThisColumn

  // Debug Log - removed for production
  useEffect(() => {
    // Trigger re-render when drag state changes
  }, [
    isOver,
    active,
    status.value,
    isDraggingFromThisColumn,
    shouldHighlight,
    activeIssueStatus,
    activeIssue,
  ])

  const getHeaderColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100'
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100'
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100'
      default:
        return 'bg-gray-100 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-gray-100 dark:bg-gray-800 rounded-xl transition-all flex flex-col h-full relative',
        shouldHighlight &&
          'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
      )}
    >
      <div
        className={cn('p-4 rounded-t-xl', getHeaderColorClasses(status.color))}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="opacity-75">{status.icon}</span>
            <h3 className="font-semibold text-lg">{status.label}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium bg-white/20 dark:bg-black/20 px-2 py-1 rounded-full">
              {issues.length}
            </span>
            {onCreateIssue && (
              <button
                onClick={onCreateIssue}
                className="p-1.5 rounded-full bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                title="Create new issue"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        {issues.length === 0 ? (
          <div
            className={cn(
              'flex items-center justify-center h-full min-h-[200px] transition-all rounded-lg p-4',
              shouldHighlight
                ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-400'
                : 'bg-gray-50 dark:bg-gray-900/30 border-2 border-dashed border-gray-300 dark:border-gray-700'
            )}
          >
            <p
              className={cn(
                'text-sm font-medium transition-all',
                shouldHighlight
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              )}
            >
              {shouldHighlight ? 'Drop here' : 'Drop issues here'}
            </p>
          </div>
        ) : (
          <SortableContext
            items={issues.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {issues.map((issue) => (
                <DraggableIssueCard
                  key={issue.id}
                  issue={issue}
                  isUpdating={updatingIssue === issue.id}
                />
              ))}
              {/* Invisible drop zone at the bottom for better detection */}
              {active && !isDraggingFromThisColumn && (
                <div className="h-20 opacity-0" />
              )}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}

interface DraggableIssueCardProps {
  issue: GitHubIssue
  isUpdating: boolean
}

function DraggableIssueCard({ issue, isUpdating }: DraggableIssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: issue.id,
      data: {
        type: 'issue',
        issue,
      },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : 'none', // Keine Transition nach dem Drop
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('transition-all duration-200', isDragging && 'opacity-0')}
    >
      <IssueCard
        issue={issue}
        isUpdating={isUpdating}
        isDragging={isDragging}
      />
    </div>
  )
}

interface IssueCardProps {
  issue: GitHubIssue
  onStatusChange?: (newStatus: string) => void
  isUpdating: boolean
  showStatusChanger?: boolean
  isDragging?: boolean
}

function IssueCard({
  issue,
  onStatusChange,
  isUpdating,
  showStatusChanger = false,
  isDragging = false,
}: IssueCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm hover:shadow-md transition-all relative',
        !showStatusChanger && 'cursor-default',
        showStatusChanger && 'cursor-move',
        'border border-gray-200 dark:border-gray-700',
        isUpdating && 'opacity-50 pointer-events-none ring-2 ring-blue-500',
        isDragging && 'shadow-xl scale-105 rotate-1',
        issue.isCreatedByUser &&
          'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <Link
              to={`/issue/${issue.repository?.owner}/${issue.repository?.name}/${issue.number}`}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 block line-clamp-2 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              {issue.title}
            </Link>
            {issue.creatorEmail && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap"
                title={
                  issue.isCreatedByUser
                    ? 'Von dir erstellt'
                    : `Erstellt von ${issue.creatorEmail}`
                }
              >
                {issue.isCreatedByUser ? 'My Issue' : issue.creatorEmail}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span className="truncate max-w-[120px]">
                {issue.repository?.name}
              </span>
            </div>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="font-mono">#{issue.number}</span>
          </div>
        </div>
        {showStatusChanger && onStatusChange && (
          <select
            value={
              issue.labels
                .find((l) => l.name.startsWith('status:'))
                ?.name.replace('status:', '') || 'open'
            }
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isUpdating}
            onClick={(e) => e.stopPropagation()}
          >
            {ISSUE_STATUSES.map((status) => (
              <option
                key={status.value}
                value={status.value}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {status.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
