import { useState, useCallback } from 'react'
import { Mic, Pause, Play, Square, Loader2, Volume2 } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { AudioVisualizer } from './AudioVisualizer'
import { AudioPlayer } from './AudioPlayer'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { transcribeAudio } from '@/lib/openai'

interface VoiceCommentRecorderProps {
  onSubmit: (audioUrl: string, transcription: string) => Promise<void>
  disabled?: boolean
  maxDuration?: number // in seconds, default 60
}

export function VoiceCommentRecorder({ 
  onSubmit, 
  disabled = false, 
  maxDuration = 60 
}: VoiceCommentRecorderProps) {
  const { user } = useAuth()
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

  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'transcribing' | 'error'>('idle')
  const [transcription, setTranscription] = useState('')
  const [storageUrl, setStorageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasProcessed, setHasProcessed] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    setError(null)
    setTranscription('')
    setStorageUrl(null)
    setHasProcessed(false)
    await startRecording()
  }

  const processRecording = useCallback(async () => {
    if (!audioBlob || !user || processingState !== 'idle' || hasProcessed) return

    setProcessingState('uploading')
    setError(null)
    setHasProcessed(true)

    try {
      // Upload to Supabase Storage
      const fileName = `comments/${user.id}/${Date.now()}_comment.webm`
      
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-recordings')
        .getPublicUrl(fileName)

      setStorageUrl(publicUrl)

      // Transcribe with Whisper
      setProcessingState('transcribing')
      const transcriptionText = await transcribeAudio(audioBlob)
      setTranscription(transcriptionText)

      setProcessingState('idle')
    } catch (err) {
      console.error('Error processing recording:', err)
      setError(err instanceof Error ? err.message : 'Failed to process recording')
      setProcessingState('error')
    }
  }, [audioBlob, user, processingState, hasProcessed])

  const handleSubmit = async () => {
    if (!storageUrl || !transcription) return

    try {
      await onSubmit(storageUrl, transcription)
      // Reset after successful submission
      resetRecording()
      setTranscription('')
      setStorageUrl(null)
      setHasProcessed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comment')
    }
  }

  const handleDiscard = () => {
    resetRecording()
    setTranscription('')
    setStorageUrl(null)
    setHasProcessed(false)
    setError(null)
  }

  const getProcessingMessage = () => {
    switch (processingState) {
      case 'uploading':
        return 'Uploading recording...'
      case 'transcribing':
        return 'Transcribing speech...'
      default:
        return ''
    }
  }

  const isProcessing = processingState !== 'idle'

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Timer Display */}
        {(recordingState !== 'idle' || recordingTime > 0) && (
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
            {formatTime(recordingTime)} / {formatTime(maxDuration)}
          </div>
        )}

        {/* Recording Button */}
        <div className="flex items-center space-x-4">
          {recordingState === 'idle' && !audioBlob ? (
            <button
              onClick={handleStartRecording}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center w-16 h-16 rounded-full transition-all',
                'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl',
                'transform hover:scale-105 active:scale-95',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Mic className="w-6 h-6" />
            </button>
          ) : recordingState === 'recording' ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={pauseRecording}
                className="flex items-center justify-center w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
              >
                <Pause className="w-5 h-5" />
              </button>
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 bg-red-500 rounded-full shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          ) : recordingState === 'paused' ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={resumeRecording}
                className="flex items-center justify-center w-16 h-16 bg-yellow-500 text-white rounded-full shadow-lg hover:bg-yellow-600 transition-colors"
              >
                <Play className="w-6 h-6" />
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Audio Visualizer */}
        {recordingState === 'recording' && (
          <div className="w-full max-w-md">
            <AudioVisualizer isRecording={true} />
          </div>
        )}

        {/* Instructions */}
        {recordingState === 'idle' && !audioBlob && (
          <div className="text-center text-gray-600 dark:text-gray-400 space-y-1">
            <p>Click to record a voice comment</p>
            <p className="text-sm">Maximum: {Math.floor(maxDuration / 60)}:{(maxDuration % 60).toString().padStart(2, '0')}</p>
          </div>
        )}
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center justify-center space-x-3 py-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-gray-700 dark:text-gray-300">
            {getProcessingMessage()}
          </span>
        </div>
      )}

      {/* Audio Preview and Transcription */}
      {audioUrl && recordingState === 'stopped' && !isProcessing && (
        <div className="space-y-4">
          {/* Audio Player */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Volume2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recording Preview
              </span>
            </div>
            <AudioPlayer audioUrl={audioUrl} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDiscard}
              disabled={disabled}
              className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Discard
            </button>
            
            {!transcription ? (
              <button
                onClick={processRecording}
                disabled={disabled || isProcessing}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Process Recording
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={disabled}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Submit Comment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Mic className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Transcription
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {transcription}
          </p>
        </div>
      )}

      {/* Error Display */}
      {(error || recordingError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error || recordingError}
        </div>
      )}
    </div>
  )
}