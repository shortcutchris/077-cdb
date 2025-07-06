import { useState } from 'react'
import { MessageSquare, Mic, Eye, Send, Loader2 } from 'lucide-react'
import { VoiceCommentRecorder } from './VoiceCommentRecorder'
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
  placeholder = "Write a comment..." 
}: CommentFormProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text')
  const [textContent, setTextContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTextSubmit = async () => {
    if (!textContent.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({ body: textContent })
      setTextContent('')
      setShowPreview(false)
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
        transcription 
      })
    } catch (error) {
      console.error('Error submitting voice comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    return text.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">
            {line.substring(3)}
          </h2>
        )
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">
            {line.substring(2)}
          </h1>
        )
      }
      // Bold
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        )
      }
      // Lists
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="ml-4 list-disc text-gray-700 dark:text-gray-300">
            {line.substring(2)}
          </li>
        )
      }
      // Code blocks
      if (line.startsWith('```')) {
        return <div key={index} className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono" />
      }
      // Inline code
      if (line.includes('`')) {
        const parts = line.split('`')
        return (
          <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
            {parts.map((part, i) => 
              i % 2 === 1 ? 
                <code key={i} className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">{part}</code> : 
                part
            )}
          </p>
        )
      }
      // Normal paragraph
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
            {line}
          </p>
        )
      }
      return <br key={index} />
    })
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
            {/* Text Input */}
            {!showPreview ? (
              <div className="space-y-2">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled || isSubmitting}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                           dark:bg-gray-700 dark:text-gray-200 resize-none"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Markdown supported: **bold**, *italic*, `code`, - lists, # headers
                </div>
              </div>
            ) : (
              /* Preview */
              <div className="min-h-[6rem] p-3 border border-gray-200 dark:border-gray-600 rounded-lg 
                            bg-gray-50 dark:bg-gray-900">
                <div className="prose dark:prose-invert max-w-none">
                  {textContent.trim() ? renderMarkdown(textContent) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">Preview will appear here...</p>
                  )}
                </div>
              </div>
            )}

            {/* Text Controls */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 
                         hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                disabled={disabled || isSubmitting}
              >
                <Eye className="h-4 w-4" />
                <span>{showPreview ? 'Edit' : 'Preview'}</span>
              </button>

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