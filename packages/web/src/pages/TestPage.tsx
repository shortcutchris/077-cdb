import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DebugResult {
  success?: boolean
  error?: string
  env?: Record<string, boolean | string>
  auth?: {
    hasAuth: boolean
    authType: string
    headerLength: number
  }
  data?: Record<string, unknown>
  responseText?: string
  status?: number
}

export function TestPage() {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testDebugFunction = async () => {
    setLoading(true)
    try {
      // Get session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setDebugResult({ error: 'No session found' })
        return
      }

      // Testing debug function with token

      const response = await fetch(
        'https://uecvnenvpgvytgkzfyrh.supabase.co/functions/v1/debug-env',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ test: true }),
        }
      )

      const data = await response.json()
      // Debug Response logged
      setDebugResult(data)
    } catch (error) {
      // Error occurred
      setDebugResult({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const testCreateIssue = async () => {
    setLoading(true)
    try {
      // Get session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setDebugResult({ error: 'No session found' })
        return
      }

      // Testing create issue function

      const response = await fetch(
        'https://uecvnenvpgvytgkzfyrh.supabase.co/functions/v1/github-create-issue',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            repository: 'shortcutchris/077-cdb',
            title: 'Test Issue from Debug Page',
            body: 'This is a test issue created from the debug page to test the Edge Function.',
            labels: ['test', 'debug'],
          }),
        }
      )

      const responseText = await response.text()
      // Raw response received

      try {
        const data = JSON.parse(responseText)
        // Create Issue Response parsed
        setDebugResult(data)
      } catch (e) {
        setDebugResult({
          error: 'Failed to parse response',
          responseText,
          status: response.status,
        })
      }
    } catch (error) {
      // Error occurred
      setDebugResult({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">
          Edge Function Test Page
        </h1>

        <div className="space-y-4">
          <button
            onClick={testDebugFunction}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Debug Function'}
          </button>

          <button
            onClick={testCreateIssue}
            disabled={loading}
            className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Create Issue Function'}
          </button>
        </div>

        {debugResult && (
          <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">
              Result:
            </h2>
            <pre className="text-sm overflow-auto bg-gray-100 dark:bg-gray-700 p-4 rounded">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
