import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Key,
  GitBranch,
  Users,
  Shield,
  FileText,
  ChevronLeft,
  Menu,
  X,
  Kanban,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAdmin } from '@/contexts/AdminContext'
import { useAuth } from '@/contexts/AuthContext'

const navigation: Array<{
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  superAdminOnly?: boolean
}> = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    name: 'Projects',
    href: '/admin/projects',
    icon: Kanban,
    superAdminOnly: true,
  },
  { name: 'Access Tokens', href: '/admin/tokens', icon: Key },
  { name: 'Repositories', href: '/admin/repositories', icon: GitBranch },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Permissions', href: '/admin/permissions', icon: Shield },
  { name: 'Audit Log', href: '/admin/audit', icon: FileText },
]

export function AdminLayout() {
  const location = useLocation()
  const { adminRole } = useAdmin()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 dark:bg-opacity-70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b dark:border-gray-700">
            <Link to="/admin" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold dark:text-white">
                Admin Panel
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden dark:text-gray-400"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Logged in as
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {user?.email}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {adminRole?.role === 'super_admin'
                ? 'Super Admin'
                : 'Repository Admin'}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation
              .filter(
                (item) =>
                  !item.superAdminOnly || adminRole?.role === 'super_admin'
              )
              .map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
          </nav>

          {/* Back to app */}
          <div className="p-4 border-t dark:border-gray-700">
            <Link
              to="/"
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to App</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow lg:hidden">
          <div className="flex h-16 items-center px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 text-lg font-semibold dark:text-white">
              Admin Panel
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
