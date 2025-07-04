import { useState } from 'react'
import { MessageCircle, Send, Mic, X, AlertCircle, Loader2 } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ClarificationDialogProps {
  questions: string[]
  transcription: string
  repository: string
  onComplete: (answers: Record<string, string>) => void
  onSkip: () => void
}

export function ClarificationDialog({
  questions,
  transcription,
  repository,
  onComplete,
  onSkip,
}: ClarificationDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')

  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    recordingTime,
    error: recordingError,
  } = useAudioRecorder()

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const clarityScore = Math.max(
    60,
    Math.min(100, 60 + Object.keys(answers).length * 10)
  )

  const handleVoiceInput = async () => {
    if (isRecording) {
      stopRecording()

      if (audioBlob) {
        setIsProcessing(true)
        try {
          // Use audio-process Edge Function to transcribe
          const { data, error } = await supabase.functions.invoke(
            'audio-process',
            {
              body: {
                audioUrl: URL.createObjectURL(audioBlob),
                audioDuration: recordingTime,
                repository: repository,
                clarificationMode: true,
                context: {
                  originalTranscription: transcription,
                  question: currentQuestion,
                  previousAnswers: answers,
                },
              },
            }
          )

          if (error) throw error
          if (data?.data?.transcription) {
            setInputValue(data.data.transcription)
          }
        } catch (err) {
          console.error('Voice input error:', err)
        } finally {
          setIsProcessing(false)
        }
      }
    } else {
      startRecording()
    }
  }

  const handleSubmitAnswer = () => {
    if (!inputValue.trim()) return

    const newAnswers = {
      ...answers,
      [`question_${currentQuestionIndex}`]: inputValue,
    }
    setAnswers(newAnswers)
    setInputValue('')

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      onComplete(newAnswers)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitAnswer()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <MessageCircle className="h-6 w-6 mr-2 text-blue-500" />
            Issue Clarification
          </h2>
          <button
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Clarity Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              Issue Clarity
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {clarityScore}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                clarityScore >= 80
                  ? 'bg-green-500'
                  : clarityScore >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${clarityScore}%` }}
            />
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-start mb-4">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {currentQuestion}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your answer will help create a more detailed and actionable issue.
            </p>
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => setInputMode('text')}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                inputMode === 'text'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              Text Input
            </button>
            <button
              onClick={() => setInputMode('voice')}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                inputMode === 'voice'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              Voice Input
            </button>
          </div>

          {inputMode === 'text' ? (
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer here..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!inputValue.trim()}
                className={cn(
                  'absolute bottom-3 right-3 p-2 rounded-md transition-colors',
                  inputValue.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <button
                  onClick={handleVoiceInput}
                  disabled={isProcessing}
                  className={cn(
                    'p-4 rounded-full transition-all',
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </button>
              </div>

              {recordingError && (
                <p className="text-red-500 text-sm text-center">
                  {recordingError}
                </p>
              )}

              {isRecording && (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  Recording... {Math.floor(recordingTime)}s
                </p>
              )}

              {inputValue && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-gray-900 dark:text-white">{inputValue}</p>
                  <button
                    onClick={handleSubmitAnswer}
                    className="mt-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    Use this answer →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {clarityScore >= 80
            ? 'Your issue already has good clarity. You can skip if you prefer.'
            : 'Answering these questions will significantly improve your issue.'}
        </p>
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm underline"
        >
          Skip clarification
        </button>
      </div>
    </div>
  )
}
