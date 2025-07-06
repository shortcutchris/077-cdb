import { useState, useEffect, useCallback } from 'react'
import {
  Mic,
  Pause,
  Play,
  Square,
  Loader2,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useUserRepositories } from '@/hooks/useUserRepositories'
import { AudioVisualizer } from './AudioVisualizer'
import { AudioPlayer } from './AudioPlayer'
import { IssuePreview } from './IssuePreview'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { transcribeAudio, transformToIssue } from '@/lib/openai'

type ProcessingState =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'transforming'
  | 'complete'
  | 'error'

interface VoiceRecorderProps {
  onRepositoryChange?: (repository: string) => void
  onIssueCreated?: () => void
  initialRepository?: string
}

export function VoiceRecorder({
  onRepositoryChange,
  onIssueCreated,
  initialRepository,
}: VoiceRecorderProps) {
  const { user } = useAuth()
  const { repositories, loading: reposLoading } = useUserRepositories()
  const {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    error: recordingError,
  } = useAudioRecorder()

  const [processingState, setProcessingState] =
    useState<ProcessingState>('idle')
  const [transcription, setTranscription] = useState<string>('')
  const [generatedIssue, setGeneratedIssue] = useState<{
    title: string
    body: string
    labels: string[]
    type: string
    priority: string
    needs_clarification?: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress] = useState(0)
  const [storageUrl, setStorageUrl] = useState<string | null>(null)
  const [selectedRepository, setSelectedRepository] = useState<string>(
    initialRepository || ''
  )
  const [hasProcessedCurrentRecording, setHasProcessedCurrentRecording] =
    useState(false)
  
  // New state for success modal
  const [issueCreationSuccess, setIssueCreationSuccess] = useState(false)
  const [createdIssueData, setCreatedIssueData] = useState<{
    title: string
    url: string
    number: number
    repository: string
  } | null>(null)

  // Update selected repository when initialRepository changes
  useEffect(() => {
    if (initialRepository) {
      setSelectedRepository(initialRepository)
    }
  }, [initialRepository])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    setError(null)
    setTranscription('')
    setGeneratedIssue(null)
    setStorageUrl(null)
    setHasProcessedCurrentRecording(false)
    await startRecording()
  }

  const handleStopRecording = () => {
    stopRecording()
  }

  // Set default repository when repositories load
  useEffect(() => {
    if (repositories.length > 0 && !selectedRepository) {
      setSelectedRepository(repositories[0].repository_full_name)
    }
  }, [repositories, selectedRepository])

  const processRecording = useCallback(async () => {
    if (!audioBlob || !user || !selectedRepository) return

    try {
      setProcessingState('uploading')
      setError(null)

      // Debug: Starting upload for user
      // Debug: Blob size and type

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_recording.webm`
      // Debug: Uploading to fileName

      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          upsert: false,
        })

      if (uploadError) {
        // Debug: Upload error
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('voice-recordings').getPublicUrl(fileName)

      // Debug: Storage public URL
      setStorageUrl(publicUrl)

      // Save recording to database
      const { data: recording, error: dbError } = await supabase
        .from('voice_recordings')
        .insert({
          user_id: user.id,
          audio_url: publicUrl,
          duration: recordingTime,
          file_size: audioBlob.size,
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days from now
        })
        .select()
        .maybeSingle()

      if (dbError) throw dbError

      // Transcribe with Whisper
      setProcessingState('transcribing')
      const transcriptionText = await transcribeAudio(audioBlob)
      setTranscription(transcriptionText)

      // Update recording with transcription
      await supabase
        .from('voice_recordings')
        .update({ transcript: transcriptionText })
        .eq('id', recording.id)

      // Transform to issue with GPT-4
      setProcessingState('transforming')
      const issue = await transformToIssue(transcriptionText, {
        repository: selectedRepository,
        language: 'de', // Auto-detect from transcription
      })
      setGeneratedIssue(issue)

      setProcessingState('complete')
    } catch (err) {
      // Debug: Processing error
      setError(
        err instanceof Error ? err.message : 'Failed to process recording'
      )
      setProcessingState('error')
    }
  }, [audioBlob, user, recordingTime, selectedRepository])

  // Auto-process when recording stops
  useEffect(() => {
    if (
      recordingState === 'stopped' &&
      audioBlob &&
      processingState === 'idle' &&
      !hasProcessedCurrentRecording
    ) {
      setHasProcessedCurrentRecording(true)
      processRecording()
    }
  }, [
    recordingState,
    audioBlob,
    processingState,
    hasProcessedCurrentRecording,
    processRecording,
  ])

  const getProcessingMessage = () => {
    switch (processingState) {
      case 'uploading':
        return 'Uploading recording...'
      case 'transcribing':
        return 'Transcribing with Whisper...'
      case 'transforming':
        return 'Creating issue with AI...'
      default:
        return ''
    }
  }

  // Show issue preview if we have a generated issue
  if (generatedIssue && processingState === 'complete') {
    return (
      <IssuePreview
        issue={generatedIssue}
        transcription={transcription}
        audioUrl={storageUrl}
        audioDuration={recordingTime}
        repository={selectedRepository}
        onEdit={(editedIssue) => setGeneratedIssue(editedIssue)}
        onConfirm={async () => {
          try {
            // Get session
            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession()

            if (sessionError || !session) {
              throw new Error('No active session. Please sign in again.')
            }

            console.log('Creating issue with Supabase SDK...')

            // Use Supabase SDK to invoke the function
            const { data, error } = await supabase.functions.invoke(
              'github-create-issue',
              {
                body: {
                  repository: selectedRepository,
                  title: generatedIssue.title,
                  body: generatedIssue.body,
                  labels: generatedIssue.labels,
                },
              }
            )

            if (error) throw error

            // Show success modal
            if (data?.success && data?.data?.html_url) {
              // Set success data for modal
              setCreatedIssueData({
                title: generatedIssue.title,
                url: data.data.html_url,
                number: data.data.number,
                repository: selectedRepository,
              })
              setIssueCreationSuccess(true)
              
              // Auto-hide modal after 5 seconds
              setTimeout(() => {
                setIssueCreationSuccess(false)
                setCreatedIssueData(null)
              }, 5000)

              // Notify parent component that an issue was created
              onIssueCreated?.()

              // Reset state
              setGeneratedIssue(null)
              setProcessingState('idle')
              setStorageUrl(null)
              setHasProcessedCurrentRecording(false)
              // Clear the audio to prevent re-processing
              resetRecording()
            } else {
              throw new Error('Failed to create issue - no URL returned')
            }
          } catch (err) {
            alert(
              `Error creating issue: ${err instanceof Error ? err.message : 'Unknown error'}`
            )
          }
        }}
        onCancel={() => {
          setGeneratedIssue(null)
          setProcessingState('idle')
          setStorageUrl(null)
          setHasProcessedCurrentRecording(false)
          // Clear the audio to prevent re-processing
          resetRecording()
        }}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Repository Selection */}
      {!reposLoading && repositories.length === 0 ? (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400 dark:text-amber-500 mb-3" />
          <h3 className="text-lg font-medium text-amber-900 dark:text-amber-100 mb-2">
            No Repository Access
          </h3>
          <p className="text-amber-700 dark:text-amber-200">
            You don&apos;t have access to any repositories yet. Please contact
            an administrator to grant you permissions.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Repository
          </label>
          <div className="relative">
            <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              value={selectedRepository}
              onChange={(e) => {
                setSelectedRepository(e.target.value)
                onRepositoryChange?.(e.target.value)
              }}
              disabled={reposLoading || repositories.length === 0}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {reposLoading ? (
                <option>Loading repositories...</option>
              ) : repositories.length === 0 ? (
                <option>No repositories available</option>
              ) : (
                repositories.map((repo) => (
                  <option
                    key={repo.repository_full_name}
                    value={repo.repository_full_name}
                  >
                    {repo.repository_full_name} {repo.is_private && '(Private)'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      {/* Recording Interface */}
      {repositories.length > 0 && (
        <div className="text-center space-y-6">
          {/* Timer Display */}
          {(recordingState !== 'idle' || recordingTime > 0) && (
            <div className="text-4xl font-mono font-bold text-gray-900 dark:text-gray-100">
              {formatTime(recordingTime)} / {formatTime(120)}
            </div>
          )}

          {/* Main Recording Button */}
          <div className="relative inline-block">
            {recordingState === 'idle' && !audioBlob ? (
              <button
                onClick={handleStartRecording}
                className={cn(
                  'relative flex items-center justify-center w-32 h-32 rounded-full transition-all',
                  'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl',
                  'transform hover:scale-105 active:scale-95'
                )}
              >
                <Mic className="w-12 h-12" />
              </button>
            ) : recordingState === 'recording' ? (
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={pauseRecording}
                  className="relative flex items-center justify-center w-20 h-20 bg-gray-900 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                >
                  <Pause className="w-8 h-8" />
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-red-500 rounded-full animate-pulse opacity-20" />
                  </div>
                  <div className="relative flex items-center justify-center w-24 h-24 bg-red-500 rounded-full shadow-lg">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center justify-center w-20 h-20 bg-gray-900 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                >
                  <Square className="w-8 h-8" />
                </button>
              </div>
            ) : recordingState === 'paused' ? (
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={resumeRecording}
                  className="relative flex items-center justify-center w-24 h-24 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 transition-colors"
                >
                  <Play className="w-10 h-10" />
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center justify-center w-20 h-20 bg-gray-900 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                >
                  <Square className="w-8 h-8" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Audio Visualizer */}
          {recordingState === 'recording' && (
            <div className="mt-8">
              <AudioVisualizer isRecording={true} />
            </div>
          )}

          {/* Error Display */}
          {(error || recordingError) && (
            <div className="max-w-md mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error || recordingError}
            </div>
          )}

          {/* Processing State */}
          {processingState !== 'idle' && processingState !== 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {getProcessingMessage()}
                </span>
              </div>
              {processingState === 'uploading' && uploadProgress > 0 && (
                <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Audio Player for Preview */}
          {audioUrl &&
            recordingState === 'stopped' &&
            processingState === 'idle' && (
              <div className="space-y-4">
                <AudioPlayer audioUrl={audioUrl} />
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <button
                    onClick={handleStartRecording}
                    className="py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    New Recording
                  </button>
                  <button
                    onClick={processRecording}
                    className="py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Process Recording
                  </button>
                </div>
              </div>
            )}

          {/* Instructions */}
          {recordingState === 'idle' && !audioBlob && (
            <div className="text-gray-600 dark:text-gray-400 space-y-2">
              <p>Click the microphone to start recording</p>
              <p className="text-sm">Maximum recording time: 2 minutes</p>
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {issueCreationSuccess && createdIssueData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Issue Created Successfully!
                </h2>
              </div>
              <button
                onClick={() => {
                  setIssueCreationSuccess(false)
                  setCreatedIssueData(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {createdIssueData.title}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <GitBranch className="h-4 w-4" />
                  <span>{createdIssueData.repository}</span>
                  <span className="text-gray-400">•</span>
                  <span>#{createdIssueData.number}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    window.open(createdIssueData.url, '_blank')
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Issue</span>
                </button>
                <button
                  onClick={() => {
                    setIssueCreationSuccess(false)
                    setCreatedIssueData(null)
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
