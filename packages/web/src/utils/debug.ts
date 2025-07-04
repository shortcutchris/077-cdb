// Debug utility that can be easily disabled in production
export const debugLog = (context: string, data: unknown) => {
  // Only log in development
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[${context}]`, data)
  }
}

export const debugError = (context: string, error: unknown) => {
  // Only log in development
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error)
  }
}
