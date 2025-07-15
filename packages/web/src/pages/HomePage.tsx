import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { IssuesList } from '@/components/IssuesList'
import { useUserRepositories } from '@/hooks/useUserRepositories'

export function HomePage() {
  const location = useLocation()
  const { repositories } = useUserRepositories()
  const [selectedRepository, setSelectedRepository] = useState<string>('')
  const [reloadTrigger, setReloadTrigger] = useState<number>(0)

  // Check if we have a repository from navigation state
  const repositoryFromState = location.state?.selectedRepository as
    | string
    | undefined

  // Set repository from state or default to first repository
  useEffect(() => {
    if (
      repositoryFromState &&
      repositories.some((r) => r.repository_full_name === repositoryFromState)
    ) {
      setSelectedRepository(repositoryFromState)
      // Clear the state after a short delay to ensure it's used
      setTimeout(() => {
        window.history.replaceState({}, document.title)
      }, 100)
    } else if (
      !selectedRepository &&
      repositories.length > 0 &&
      !repositoryFromState
    ) {
      setSelectedRepository(repositories[0].repository_full_name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositories, repositoryFromState])

  const handleIssueCreated = () => {
    // Trigger reload of issues list
    setReloadTrigger(Date.now())
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 p-8 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 h-full">
            {/* Left Column - Voice Recorder */}
            <div className="lg:overflow-y-auto">
              <VoiceRecorder
                onRepositoryChange={setSelectedRepository}
                onIssueCreated={handleIssueCreated}
                initialRepository={selectedRepository}
              />
            </div>

            {/* Right Column - Issues List */}
            <div className="flex-1 lg:flex-initial lg:h-full overflow-hidden">
              <IssuesList
                repository={selectedRepository}
                reloadTrigger={reloadTrigger}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
