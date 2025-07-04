// Debug helper for OAuth redirect issues
export const debugOAuthRedirect = () => {
  const currentUrl = window.location.href
  const origin = window.location.origin
  const envUrl = import.meta.env.VITE_APP_URL

  console.log('=== OAuth Debug Info ===')
  console.log('Current URL:', currentUrl)
  console.log('Window Origin:', origin)
  console.log('VITE_APP_URL:', envUrl)
  console.log(
    'Expected Redirect:',
    envUrl ? `${envUrl}/login` : `${origin}/login`
  )

  // Check if we're on Replit
  const isReplit = window.location.hostname.includes('repl')
  console.log('Is Replit?:', isReplit)

  return {
    currentUrl,
    origin,
    envUrl,
    expectedRedirect: envUrl ? `${envUrl}/login` : `${origin}/login`,
    isReplit,
  }
}

// Get the exact redirect URL that will be sent to GitHub
export const getOAuthRedirectUrl = () => {
  const envUrl = import.meta.env.VITE_APP_URL

  // If we have an env URL, use it with /login appended
  if (envUrl) {
    // Ensure no double slashes
    const cleanUrl = envUrl.replace(/\/$/, '')
    return `${cleanUrl}/login`
  }

  // Otherwise use current origin
  return `${window.location.origin}/login`
}
