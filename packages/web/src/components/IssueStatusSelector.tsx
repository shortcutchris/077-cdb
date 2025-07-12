import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ISSUE_STATUSES } from '@/constants/issueStatuses'

export interface IssueStatus {
  value: string
  label: string
  color: string
  icon: React.ReactNode
}

interface IssueStatusSelectorProps {
  currentStatus: string
  onStatusChange: (newStatus: string) => void
  disabled?: boolean
}

export function IssueStatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
}: IssueStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const current = ISSUE_STATUSES.find((s) => s.value === currentStatus) || ISSUE_STATUSES[0]

  const getStatusColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700'
      case 'blue':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
      case 'purple':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all',
          getStatusColorClasses(current.color),
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:opacity-80 cursor-pointer'
        )}
      >
        {current.icon}
        <span className="text-sm font-medium">{current.label}</span>
        {!disabled && (
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {ISSUE_STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => {
                  onStatusChange(status.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  status.value === currentStatus
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
              >
                <span className={cn('flex items-center', getStatusColorClasses(status.color).split(' ').slice(0, 2).join(' '))}>
                  {status.icon}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {status.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}