// CORS Configuration for Replit and other deployments

// Get the current environment
const isReplit = window.location.hostname.includes('repl')

// Define allowed origins based on environment
export const getAllowedOrigins = () => {
  const origins = ['http://localhost:5174', 'http://localhost:3000']

  // Add Replit domains
  if (isReplit) {
    origins.push(
      `https://${window.location.hostname}`,
      'https://*.repl.co',
      'https://*.replit.dev',
      'https://*.replit.app'
    )
  }

  // Add custom domain from env if available
  if (import.meta.env.VITE_APP_URL) {
    origins.push(import.meta.env.VITE_APP_URL)
  }

  return origins
}

// Configure fetch options with proper CORS headers
export const getFetchOptions = (options: RequestInit = {}): RequestInit => {
  return {
    ...options,
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }
}

// Helper to check if we're on Replit
export const isOnReplit = () => {
  return (
    window.location.hostname.includes('repl') ||
    window.location.hostname.includes('replit')
  )
}

// Get the correct API URL based on environment
export const getApiUrl = () => {
  // On Replit, we might need to adjust the Supabase URL
  if (isOnReplit() && import.meta.env.VITE_REPLIT_SUPABASE_URL) {
    return import.meta.env.VITE_REPLIT_SUPABASE_URL
  }
  return import.meta.env.VITE_SUPABASE_URL
}
