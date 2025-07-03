import { useAuth } from '@/contexts/AuthContext'

export class GitHubAPI {
  private token: string | null

  constructor(token: string | null) {
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (!this.token) {
      throw new Error('No GitHub token available')
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return response.json()
  }

  async getUser() {
    return this.request('/user')
  }

  async getUserRepos() {
    return this.request('/user/repos?sort=updated&per_page=100')
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[]
  ) {
    return this.request(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    })
  }
}

// Hook to use GitHub API with current auth token
export function useGitHubAPI() {
  const { getGitHubToken } = useAuth()
  const token = getGitHubToken()

  return new GitHubAPI(token)
}
