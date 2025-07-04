import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TestResult {
  success?: boolean
  error?: string
  data?: Record<string, unknown>
  responseText?: string
  status?: number
  headers?: Record<string, string>
}

export function TestPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testCreateIssue = async () => {
    setLoading(true)
    try {
      // Get session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setTestResult({ error: 'No session found' })
        return
      }

      console.log('Testing create issue function with token...')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-create-issue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            repository: 'shortcutchris/077-cdb',
            title: 'Test Issue from Test Page',
            body: 'This is a test issue created from the test page to verify Edge Function works correctly.',
            labels: ['test', 'edge-function'],
          }),
        }
      )

      const responseText = await response.text()
      console.log('Raw response:', responseText)
      console.log('Response status:', response.status)
      console.log(
        'Response headers:',
        Object.fromEntries(response.headers.entries())
      )

      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText)
        console.log('Parsed response:', data)
        setTestResult({
          success: response.ok,
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        })
      } catch (e) {
        // If not JSON, show raw response
        setTestResult({
          success: response.ok,
          responseText,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          error: responseText.includes('<!DOCTYPE html>')
            ? 'Edge Function returned HTML instead of JSON'
            : 'Failed to parse response',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setTestResult({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const testDirectFetch = async () => {
    setLoading(true)
    try {
      // Get session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setTestResult({ error: 'No session found' })
        return
      }

      // Test with direct invocation
      const { data, error } = await supabase.functions.invoke(
        'github-create-issue',
        {
          body: {
            repository: 'shortcutchris/077-cdb',
            title: 'Test Issue via Supabase SDK',
            body: 'This issue was created using the Supabase SDK directly.',
            labels: ['test', 'sdk'],
          },
        }
      )

      if (error) throw error

      setTestResult({
        success: true,
        data,
      })
    } catch (error) {
      console.error('Error:', error)
      setTestResult({
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
          <div className="space-x-4">
            <button
              onClick={testCreateIssue}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Create Issue (Fetch)'}
            </button>

            <button
              onClick={testDirectFetch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Create Issue (SDK)'}
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Check the browser console for detailed logs
          </div>
        </div>

        {testResult && (
          <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">
              Result:
            </h2>
            <pre className="text-sm overflow-auto bg-gray-100 dark:bg-gray-700 p-4 rounded">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
