import { useEffect } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface StatusUpdateModalProps {
  isOpen: boolean
  status: 'loading' | 'success' | 'error'
  message?: string
  onClose?: () => void
}

export function StatusUpdateModal({
  isOpen,
  status,
  message,
  onClose,
}: StatusUpdateModalProps) {
  useEffect(() => {
    if (status === 'success') {
      // Auto-close after 2 seconds
      const timer = setTimeout(() => {
        onClose?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center text-center">
          {status === 'loading' && (
            <>
              <LoadingSpinner className="mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Updating Issue Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message || 'Syncing with GitHub...'}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Status Updated
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message || 'Issue status has been successfully updated.'}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Update Failed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {message || 'Failed to update issue status. Please try again.'}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
