import { Outlet } from 'react-router-dom'
import { UserMenu } from '@/components/UserMenu'
import { useAdmin } from '@/contexts/AdminContext'
import { Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export function MainLayout() {
  const { isAdmin, loading } = useAdmin()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link
              to="/"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              SpecifAI
            </Link>
            <div className="flex items-center space-x-4">
              {/* Temporarily show admin link always for testing */}
              <Link
                to="/admin"
                className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title={
                  loading
                    ? 'Loading admin status...'
                    : isAdmin
                      ? 'Admin Panel'
                      : 'Admin Panel (Testing)'
                }
              >
                <Shield className="h-5 w-5" />
                <span>Admin</span>
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Outlet />
      </main>
    </div>
  )
}
