import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Github } from 'lucide-react'

export function LoginPage() {
  const { user, signInWithGitHub, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to SpecifAI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Transform your voice into GitHub issues in seconds
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={signInWithGitHub}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <Github className="h-5 w-5 mr-2" />
            Sign in with GitHub
          </button>

          <p className="text-xs text-center text-gray-600">
            By signing in, you agree to authorize SpecifAI to access your GitHub
            account for creating issues in repositories you have access to.
          </p>
        </div>
      </div>
    </div>
  )
}
