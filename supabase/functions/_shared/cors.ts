// CORS headers for Supabase Edge Functions
// These headers are needed when deploying on Replit or other domains

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, replace with specific domains
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

// For production on Replit, you should use specific origins instead of '*'
export const getCorsHeaders = (origin: string | null) => {
  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:5174',
    'http://localhost:3000',
    'https://*.repl.co', // Replit domains
    'https://*.replit.dev', // New Replit domains
    process.env.ALLOWED_ORIGIN, // Custom domain from env
  ].filter(Boolean)

  // Check if origin is allowed
  const isAllowed =
    origin &&
    allowedOrigins.some((allowed) => {
      if (allowed.includes('*')) {
        // Handle wildcard domains
        const regex = new RegExp(allowed.replace('*', '.*'))
        return regex.test(origin)
      }
      return allowed === origin
    })

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}
