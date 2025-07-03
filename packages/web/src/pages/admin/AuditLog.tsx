import { FileText } from 'lucide-react'

export function AdminAuditLog() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-2 text-gray-600">
          View all admin actions and system events
        </p>
      </div>

      <div className="rounded-lg bg-white shadow p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-500">
          Audit log interface will be available soon.
        </p>
      </div>
    </div>
  )
}
