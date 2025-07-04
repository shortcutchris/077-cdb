import { useState, useEffect } from 'react'
import { Copy, RefreshCw } from 'lucide-react'

interface DebugData {
  timestamp: string
  oauthUrl: string
  redirectUri: string
  expectedRedirect: string
  viteAppUrl?: string
  windowOrigin: string
}

export function DebugPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null)

  useEffect(() => {
    loadDebugData()
  }, [])

  const loadDebugData = () => {
    const oauthDebug = localStorage.getItem('oauth_debug')
    if (oauthDebug) {
      setDebugData(JSON.parse(oauthDebug))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearDebugData = () => {
    localStorage.removeItem('oauth_debug')
    setDebugData(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">
          OAuth Debug Information
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Current Environment
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Window Origin:
              </span>
              <span className="dark:text-gray-200">
                {window.location.origin}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Current URL:
              </span>
              <span className="dark:text-gray-200">{window.location.href}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                VITE_APP_URL:
              </span>
              <span className="dark:text-gray-200">
                {import.meta.env.VITE_APP_URL || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                VITE_SUPABASE_URL:
              </span>
              <span className="dark:text-gray-200">
                {import.meta.env.VITE_SUPABASE_URL || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                VITE_OPENAI_API_KEY:
              </span>
              <span className="dark:text-gray-200">
                {import.meta.env.VITE_OPENAI_API_KEY ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">
              Last OAuth Attempt
            </h2>
            <button
              onClick={loadDebugData}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 dark:text-gray-400" />
            </button>
          </div>

          {debugData ? (
            <div className="space-y-4">
              <div className="font-mono text-sm space-y-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Timestamp:
                  </span>
                  <span className="ml-2 dark:text-gray-200">
                    {debugData.timestamp}
                  </span>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Expected Redirect:
                  </span>
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded break-all">
                    <span className="dark:text-gray-200">
                      {debugData.expectedRedirect}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(debugData.expectedRedirect)
                      }
                      className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <Copy className="h-3 w-3 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Actual redirect_uri sent to GitHub:
                  </span>
                  <div className="mt-1 p-2 bg-red-100 dark:bg-red-900/20 rounded break-all">
                    <span className="text-red-700 dark:text-red-300">
                      {debugData.redirectUri}
                    </span>
                    <button
                      onClick={() => copyToClipboard(debugData.redirectUri)}
                      className="ml-2 p-1 hover:bg-red-200 dark:hover:bg-red-900/40 rounded"
                    >
                      <Copy className="h-3 w-3 text-red-700 dark:text-red-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Full OAuth URL:
                  </span>
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded break-all text-xs">
                    <span className="dark:text-gray-200">
                      {debugData.oauthUrl}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={clearDebugData}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear Debug Data
              </button>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No OAuth debug data found. Try signing in with GitHub first.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
