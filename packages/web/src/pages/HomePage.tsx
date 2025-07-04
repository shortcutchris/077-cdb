import { useState, useEffect } from 'react'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { IssuesList } from '@/components/IssuesList'
import { useUserRepositories } from '@/hooks/useUserRepositories'

export function HomePage() {
  const { repositories } = useUserRepositories()
  const [selectedRepository, setSelectedRepository] = useState<string>('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Set the first repository as default when repositories load
  useEffect(() => {
    if (!selectedRepository && repositories.length > 0) {
      setSelectedRepository(repositories[0].repository_full_name)
    }
  }, [repositories, selectedRepository])

  const handleIssueCreated = () => {
    // Trigger a refresh of the issues list
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Voice Recorder */}
        <div>
          <VoiceRecorder
            onRepositoryChange={setSelectedRepository}
            onIssueCreated={handleIssueCreated}
            initialRepository={selectedRepository}
          />
        </div>

        {/* Right Column - Issues List */}
        <div>
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
