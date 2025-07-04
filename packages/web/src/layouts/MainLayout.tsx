import { Outlet } from 'react-router-dom'
import { UserMenu } from '@/components/UserMenu'
import { Link } from 'react-router-dom'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 lg:py-6">
            <Link
              to="/"
              className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white"
            >
              SpecifAI
            </Link>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
