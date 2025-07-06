import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { IssuesList } from '@/components/IssuesList'
import { useUserRepositories } from '@/hooks/useUserRepositories'

export function HomePage() {
  const location = useLocation()
  const { repositories } = useUserRepositories()
  const [selectedRepository, setSelectedRepository] = useState<string>('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Check if we have a repository from navigation state
  const repositoryFromState = location.state?.selectedRepository as
    | string
    | undefined

  // Set repository from state or default to first repository
  useEffect(() => {
    console.log('HomePage - repositoryFromState:', repositoryFromState)
    console.log('HomePage - repositories:', repositories.length)

    if (
      repositoryFromState &&
      repositories.some((r) => r.repository_full_name === repositoryFromState)
    ) {
      console.log('Setting repository from state:', repositoryFromState)
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
      console.log(
        'Setting default repository:',
        repositories[0].repository_full_name
      )
      setSelectedRepository(repositories[0].repository_full_name)
    }
  }, [repositories, repositoryFromState])

  const handleIssueCreated = () => {
    // Trigger a refresh of the issues list
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 animate-fadeIn">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Left Column - Voice Recorder */}
        <div>
          <VoiceRecorder
            onRepositoryChange={setSelectedRepository}
            onIssueCreated={handleIssueCreated}
            initialRepository={selectedRepository}
          />
        </div>

        {/* Right Column - Issues List */}
        <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)] lg:self-start">
          <IssuesList
            repository={selectedRepository}
            onIssueCreated={handleIssueCreated}
            key={refreshTrigger}
          />
        </div>
      </div>
    </div>
  )
}
