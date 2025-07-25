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
  const [isCreatingIssue, setIsCreatingIssue] = useState<boolean>(false)

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
    <div className="h-full flex flex-col">
      <div className="flex-1 p-8 min-h-0">
        <div className="max-w-7xl mx-auto h-full">
          <div
            className={`flex flex-col ${isCreatingIssue ? '' : 'lg:grid lg:grid-cols-2'} gap-8 h-full`}
          >
            {/* Left Column - Voice Recorder */}
            <div
              className={`h-full overflow-hidden flex flex-col ${isCreatingIssue ? 'lg:col-span-full' : ''}`}
            >
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                <VoiceRecorder
                  onRepositoryChange={setSelectedRepository}
                  onIssueCreated={handleIssueCreated}
                  initialRepository={selectedRepository}
                  onIssuePreviewChange={setIsCreatingIssue}
                />
              </div>
            </div>

            {/* Right Column - Issues List */}
            {!isCreatingIssue && (
              <div className="h-full min-h-0">
                <IssuesList
                  repository={selectedRepository}
                  reloadTrigger={reloadTrigger}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
