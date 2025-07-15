import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  LogOut,
  User,
  Github,
  Shield,
  Moon,
  Sun,
  FolderKanban,
  Home,
  ChevronDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const adminContext = useAdmin()
  const { theme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Extract admin values with explicit checks
  const isAdmin = adminContext.isAdmin === true
  const adminLoading = adminContext.loading === true

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${user.email}`
  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.user_name || user.email

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full sm:w-64 space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:shadow-md border border-gray-200 dark:border-gray-700 group"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {displayName}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-1">
            {/* Home Link */}
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left rounded-md"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            {user.user_metadata?.user_name && (
              <a
                href={`https://github.com/${user.user_metadata.user_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Github className="w-4 h-4" />
                <span>GitHub Profile</span>
              </a>
            )}

            {/* Projects Link - Only show for non-admin users */}
            {adminLoading === false && isAdmin === false && (
              <Link
                to="/projects"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left rounded-md"
              >
                <FolderKanban className="w-4 h-4" />
                <span>My Projects</span>
              </Link>
            )}

            {/* Admin Dashboard Link - Only show when confirmed admin */}
            {adminLoading === false && isAdmin === true && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left rounded-md"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <button
              onClick={() => {
                toggleTheme()
                setIsOpen(false)
              }}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors w-full text-left rounded-md"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              <span className="ml-auto text-xs text-gray-400">⌘⇧L</span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors w-full text-left rounded-md"
            >
              <User className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

            <button
              onClick={async () => {
                await signOut()
                setIsOpen(false)
              }}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left rounded-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
