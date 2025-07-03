export interface User {
  id: string
  email: string
  githubUsername?: string
  createdAt: Date
  updatedAt: Date
}

export interface VoiceRecording {
  id: string
  userId: string
  audioUrl: string
  duration: number
  transcript?: string
  createdAt: Date
}

export interface Issue {
  id: string
  userId: string
  recordingId: string
  githubIssueNumber?: number
  repositoryId: string
  title: string
  body: string
  labels: string[]
  assignees: string[]
  status: IssueStatus
  createdAt: Date
  updatedAt: Date
}

export enum IssueStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  CREATED = 'created',
  FAILED = 'failed',
}

export interface AgentTask {
  id: string
  issueId: string
  status: AgentTaskStatus
  prNumber?: number
  error?: string
  createdAt: Date
  updatedAt: Date
}

export enum AgentTaskStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  NEEDS_INFO = 'needs_info',
  BLOCKED = 'blocked',
}
