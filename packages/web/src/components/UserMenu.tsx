import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User, Github } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {displayName}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="py-2">
            {user.user_metadata?.user_name && (
              <a
                href={`https://github.com/${user.user_metadata.user_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub Profile</span>
              </a>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
            >
              <User className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <hr className="my-2 border-gray-200" />

            <button
              onClick={async () => {
                await signOut()
                setIsOpen(false)
              }}
              className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
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
