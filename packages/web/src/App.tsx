import { useAuth } from '@/contexts/AuthContext'
import { UserMenu } from '@/components/UserMenu'
import { VoiceRecorder } from '@/components/VoiceRecorder'

function App() {
  const { user, loading, error, signInWithGitHub } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">SpecifAI</h1>
            <div>
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={signInWithGitHub}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Sign in with GitHub
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {user ? (
          <VoiceRecorder />
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to SpecifAI
            </h2>
            <p className="text-gray-600 mb-8">
              Please sign in with GitHub to start creating issues with your
              voice
            </p>
            <button
              onClick={signInWithGitHub}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Sign in with GitHub
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
