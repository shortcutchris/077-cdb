import { FileText } from 'lucide-react'

export function AdminAuditLog() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Audit Log
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View all admin actions and system events
        </p>
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 shadow p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          Coming Soon
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Audit log interface will be available soon.
        </p>
      </div>
    </div>
  )
}
