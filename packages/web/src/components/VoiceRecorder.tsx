import { useState, useEffect, useCallback } from 'react'
import {
  Mic,
  Pause,
  Play,
  Square,
  Loader2,
  GitBranch,
  AlertCircle,
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
    labels?: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress] = useState(0)
  const [storageUrl, setStorageUrl] = useState<string | null>(null)
  const [selectedRepository, setSelectedRepository] = useState<string>(
    initialRepository || ''
  )

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
        .single()

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
    if (recordingState === 'stopped' && audioBlob) {
      processRecording()
    }
  }, [recordingState, audioBlob, processRecording])

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
            // Debug: Creating issue

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-create-issue`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                  repository: selectedRepository,
                  title: generatedIssue.title,
                  body: generatedIssue.body,
                  labels: generatedIssue.labels,
                }),
              }
            )

            const responseData = await response.json()
            // Debug: Edge function response

            if (!response.ok) {
              throw new Error(responseData.error || 'Failed to create issue')
            }

            // Show success and redirect to issue
            alert(
              `Issue created successfully! View it at: ${responseData.data.html_url}`
            )
            window.open(responseData.data.html_url, '_blank')

            // Notify parent component that an issue was created
            onIssueCreated?.()

            // Reset state
            setGeneratedIssue(null)
            setProcessingState('idle')
            setStorageUrl(null)
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
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-40 bg-red-500 rounded-full animate-pulse opacity-20" />
                  </div>
                  <button
                    onClick={pauseRecording}
                    className="relative flex items-center justify-center w-32 h-32 bg-red-500 text-white rounded-full shadow-lg z-10"
                  >
                    <Pause className="w-12 h-12" />
                  </button>
                </div>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center justify-center w-16 h-16 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : recordingState === 'paused' ? (
              <div className="space-y-4">
                <button
                  onClick={resumeRecording}
                  className="relative flex items-center justify-center w-32 h-32 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600"
                >
                  <Play className="w-12 h-12" />
                </button>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center justify-center w-16 h-16 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Audio Visualizer */}
          {recordingState === 'recording' && (
            <AudioVisualizer isRecording={true} />
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
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleStartRecording}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    New Recording
                  </button>
                  <button
                    onClick={processRecording}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
    </div>
  )
}
