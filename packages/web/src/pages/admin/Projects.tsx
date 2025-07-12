import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AlertCircle, GitBranch, ChevronDown } from 'lucide-react'
import { ISSUE_STATUSES } from '@/constants/issueStatuses'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

export function ProjectsPage() {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  )

  useEffect(() => {
    loadAllIssues()
  }, [])

  const loadAllIssues = async () => {
    try {
      setLoading(true)
      setError(null)

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
            // Add repository info to each issue
            const issuesWithRepo = issues.map((issue: GitHubIssue) => ({
              ...issue,
              repository: {
                full_name: repo.repository_full_name,
                name: repo.name,
                owner: repo.owner,
              },
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
    } catch (err) {
      console.error('Error loading issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      return
    }

    // Find the issue that was dragged
    const draggedIssue = Object.values(groupedIssues)
      .flat()
      .find((issue) => issue.id === active.id)

    if (!draggedIssue) return

    // Determine which column it was dropped into
    // Check if we're dropping on a column or an issue within a column
    let newStatus: string
    const validStatuses = ['open', 'planned', 'in-progress', 'done']

    // If dropping on a column directly
    if (validStatuses.includes(over.id as string)) {
      newStatus = over.id as string
    } else {
      // If dropping on an issue, find which column it belongs to
      const targetIssue = Object.values(groupedIssues)
        .flat()
        .find((issue) => issue.id === over.id)

      if (!targetIssue) return

      // Find the status from the target issue's labels
      const statusLabel = targetIssue.labels.find((l: { name: string }) =>
        l.name.startsWith('status:')
      )
      newStatus = statusLabel?.name.replace('status:', '') || 'open'
    }

    // Get current status from labels
    const currentStatusLabel = draggedIssue.labels.find((l: { name: string }) =>
      l.name.startsWith('status:')
    )
    const currentStatus =
      currentStatusLabel?.name.replace('status:', '') || 'open'

    // If status hasn't changed, do nothing
    if (currentStatus === newStatus) return

    // Update the issue status
    await handleStatusChange(
      draggedIssue.id,
      draggedIssue.repository!.full_name,
      draggedIssue.number,
      newStatus
    )
  }

  const handleStatusChange = async (
    issueId: number,
    repository: string,
    issueNumber: number,
    newStatus: string
  ) => {
    setUpdatingIssue(issueId)
    try {
      const { data, error } = await supabase.functions.invoke(
        'github-update-issue-status',
        {
          body: {
            repository,
            issueNumber,
            status: newStatus,
          },
        }
      )

      if (error) throw error

      if (data?.success) {
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
      alert('Failed to update issue status')
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

  const totalIssues = Object.values(groupedIssues).reduce(
    (sum, issues) => sum + issues.length,
    0
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects Overview
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Manage all issues across your repositories
          </p>
        </div>

        {totalIssues === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No issues found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Your repositories don&apos;t have any issues yet. Create your
                first issue to see it here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Status Selector */}
            <div className="md:hidden mb-6">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
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
                    <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {
                        groupedIssues[selectedStatus as keyof GroupedIssues]
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
                            'w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700',
                            status.value === selectedStatus &&
                              'bg-gray-50 dark:bg-gray-700'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {status.icon}
                            <span>{status.label}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {
                              groupedIssues[status.value as keyof GroupedIssues]
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
            <div className="hidden md:block">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-4 gap-6 h-[calc(100vh-240px)]">
                  {ISSUE_STATUSES.map((status) => (
                    <DroppableColumn
                      key={status.value}
                      status={status}
                      issues={
                        groupedIssues[status.value as keyof GroupedIssues]
                      }
                      updatingIssue={updatingIssue}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="transform rotate-2 opacity-95">
                      <IssueCard
                        issue={
                          Object.values(groupedIssues)
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
              {groupedIssues[selectedStatus as keyof GroupedIssues].length ===
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
                groupedIssues[selectedStatus as keyof GroupedIssues].map(
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
        )}
      </div>
    </div>
  )
}

interface DroppableColumnProps {
  status: (typeof ISSUE_STATUSES)[0]
  issues: GitHubIssue[]
  updatingIssue: number | null
}

function DroppableColumn({
  status,
  issues,
  updatingIssue,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.value,
    data: {
      type: 'column',
      status: status.value,
    },
  })

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
        'bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden transition-all flex flex-col h-full',
        isOver && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
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
          <span className="text-sm font-medium bg-white/20 dark:bg-black/20 px-2 py-1 rounded-full">
            {issues.length}
          </span>
        </div>
      </div>
      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
        id={status.value}
      >
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-3">
            {issues.map((issue) => (
              <DraggableIssueCard
                key={issue.id}
                issue={issue}
                isUpdating={updatingIssue === issue.id}
              />
            ))}
          </div>
          {issues.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
                Drop issues here
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

interface DraggableIssueCardProps {
  issue: GitHubIssue
  isUpdating: boolean
}

function DraggableIssueCard({ issue, isUpdating }: DraggableIssueCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: 'issue',
      issue,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'opacity-0')}
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
        'bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move',
        'border border-gray-200 dark:border-gray-700',
        isUpdating && 'opacity-50 pointer-events-none',
        isDragging && 'shadow-xl scale-105 rotate-1'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 block line-clamp-2"
            onClick={(e) => e.stopPropagation()}
          >
            {issue.title}
          </a>
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
            className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isUpdating}
            onClick={(e) => e.stopPropagation()}
          >
            {ISSUE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
