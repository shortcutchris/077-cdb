export const MAX_RECORDING_DURATION = 120 // 2 minutes in seconds
export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024 // 25MB
export const AUDIO_RETENTION_DAYS = 30

export const API_TIMEOUTS = {
  WHISPER: 30000, // 30 seconds
  GPT: 60000, // 60 seconds
  GITHUB: 10000, // 10 seconds
} as const

export const ISSUE_TEMPLATES = {
  BUG: 'bug',
  FEATURE: 'feature',
  TASK: 'task',
} as const

export const TARGET_METRICS = {
  TIME_TO_ISSUE: 60, // seconds
  CLARIFICATION_RATE_REDUCTION: 0.3, // 30%
  CI_PASS_RATE: 0.8, // 80%
  AGENT_DETECTION_TIME: 60, // seconds
  SUPABASE_LATENCY: 3, // seconds
} as const
