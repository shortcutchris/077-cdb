import { useState } from 'react'
import { MessageSquare, Mic, Send, Loader2 } from 'lucide-react'
import { VoiceCommentRecorder } from './VoiceCommentRecorder'
import { MarkdownEditor } from './MarkdownEditor'
import { cn } from '@/lib/utils'

interface CommentFormProps {
  onSubmit: (comment: {
    body: string
    audioUrl?: string
    transcription?: string
  }) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function CommentForm({
  onSubmit,
  disabled = false,
  placeholder = 'Write a comment...',
}: CommentFormProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text')
  const [textContent, setTextContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTextSubmit = async () => {
    if (!textContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit({ body: textContent })
      setTextContent('')
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVoiceSubmit = async (audioUrl: string, transcription: string) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        body: transcription,
        audioUrl,
        transcription,
      })
    } catch (error) {
      console.error('Error submitting voice comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2',
            'transition-colors',
            activeTab === 'text'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
          disabled={disabled}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Text</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2',
            'transition-colors',
            activeTab === 'voice'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
          disabled={disabled}
        >
          <Mic className="h-4 w-4" />
          <span>Voice</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'text' ? (
          <div className="space-y-4">
            {/* Markdown Editor */}
            <MarkdownEditor
              value={textContent}
              onChange={setTextContent}
              placeholder={placeholder}
              minHeight="150px"
            />

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleTextSubmit}
                disabled={disabled || isSubmitting || !textContent.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                         hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                         transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Comment</span>
              </button>
            </div>
          </div>
        ) : (
          /* Voice Tab */
          <VoiceCommentRecorder
            onSubmit={handleVoiceSubmit}
            disabled={disabled || isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
