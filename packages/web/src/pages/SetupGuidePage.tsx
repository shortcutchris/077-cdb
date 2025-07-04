import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'

export function SetupGuidePage() {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  const replitUrl = window.location.origin
  const redirectUrl = `${replitUrl}/login`

  const copyToClipboard = (text: string, item: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(item)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">
          Replit Deployment Setup Guide
        </h1>

        <div className="space-y-6">
          {/* Step 1: Environment Variables */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Step 1: Environment Variables in Replit
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add these to your Replit Secrets:
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <code className="text-sm">VITE_APP_URL</code>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-blue-600 dark:text-blue-400">
                    {replitUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(replitUrl, 'app-url')}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    {copiedItem === 'app-url' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <code className="text-sm">VITE_OPENAI_API_KEY</code>
                <span className="text-sm text-gray-500">
                  (rename from OPENAI_API_KEY)
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Supabase Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Step 2: Supabase Dashboard Configuration
            </h2>
            <ol className="space-y-4">
              <li>
                <p className="font-medium dark:text-gray-200">
                  1. Go to your Supabase project dashboard
                </p>
                <a
                  href="https://supabase.com/dashboard/project/uecvnenvpgvytgkzfyrh/auth/url-configuration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mt-2"
                >
                  Open URL Configuration
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
              <li>
                <p className="font-medium dark:text-gray-200">
                  2. Add this URL to &quot;Redirect URLs&quot;:
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    {redirectUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(redirectUrl, 'redirect-url')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    {copiedItem === 'redirect-url' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </li>
              <li>
                <p className="font-medium dark:text-gray-200">
                  3. Also add wildcards for development:
                </p>
                <div className="space-y-2 mt-2">
                  <code className="block p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    https://*.replit.dev/**
                  </code>
                  <code className="block p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    https://*.replit.app/**
                  </code>
                  <code className="block p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    https://*.repl.co/**
                  </code>
                </div>
              </li>
              <li>
                <p className="font-medium dark:text-gray-200">
                  4. Save the changes
                </p>
              </li>
            </ol>
          </div>

          {/* Step 3: GitHub OAuth App */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Step 3: Verify GitHub OAuth App
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your GitHub OAuth app should already have the correct callback
              URL:
            </p>
            <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
              https://uecvnenvpgvytgkzfyrh.supabase.co/auth/v1/callback
            </code>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This is correct and should not be changed.
            </p>
          </div>

          {/* Troubleshooting */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
              Troubleshooting Tips
            </h3>
            <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              <li>• Clear browser cookies and try again</li>
              <li>• Ensure all URLs use HTTPS (not HTTP)</li>
              <li>• Check that the Replit URL hasn&apos;t changed</li>
              <li>• Wait a few minutes for Supabase changes to propagate</li>
              <li>• Try an incognito/private browser window</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
