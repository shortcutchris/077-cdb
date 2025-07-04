import { useState } from 'react'
import {
  Check,
  X,
  Edit2,
  AlertCircle,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { AudioPlayer } from './AudioPlayer'
import { ClarificationDialog } from './ClarificationDialog'

interface IssueData {
  title: string
  body: string
  labels: string[]
  type: string
  priority: string
  needs_clarification?: string[]
}

interface IssuePreviewProps {
  issue: IssueData
  transcription: string
  audioUrl: string | null
  audioDuration?: number
  repository?: string
  onEdit: (issue: IssueData) => void
  onConfirm: () => void
  onCancel: () => void
}

export function IssuePreview({
  issue,
  transcription,
  audioUrl,
  audioDuration,
  repository,
  onEdit,
  onConfirm,
  onCancel,
}: IssuePreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedIssue, setEditedIssue] = useState(issue)
  const [showClarification, setShowClarification] = useState(false)
  const [isImproving, setIsImproving] = useState(false)

  const handleSaveEdit = () => {
    onEdit(editedIssue)
    setIsEditing(false)
  }

  const handleClarificationComplete = async (
    answers: Record<string, string>
  ) => {
    setIsImproving(true)
    setShowClarification(false)

    try {
      // For now, just show a message until Edge Functions are deployed
      // Log answers for debugging
      // eslint-disable-next-line no-console
      console.log('Clarification answers received:', answers)
      alert(
        'Clarification feature will be available once Edge Functions are deployed.'
      )

      // TODO: Once Edge Functions are deployed, uncomment this:
      // const { data, error } = await supabase.functions.invoke('audio-process', {
      //   body: {
      //     audioUrl: audioUrl || '',
      //     audioDuration: audioDuration || 0,
      //     repository: repository || '',
      //     clarificationMode: false,
      //     context: {
      //       originalTranscription: transcription,
      //       previousAnswers: answers
      //     }
      //   }
      // })
    } catch (err) {
      console.error('Failed to improve issue:', err)
    } finally {
      setIsImproving(false)
    }
  }

  const labelColors: Record<string, string> = {
    feature: 'bg-green-100 text-green-800',
    bug: 'bg-red-100 text-red-800',
    enhancement: 'bg-blue-100 text-blue-800',
    task: 'bg-purple-100 text-purple-800',
    'high-priority': 'bg-orange-100 text-orange-800',
    frontend: 'bg-cyan-100 text-cyan-800',
    backend: 'bg-indigo-100 text-indigo-800',
  }

  // Show clarification dialog if requested
  if (showClarification && issue.needs_clarification) {
    return (
      <ClarificationDialog
        questions={issue.needs_clarification}
        transcription={transcription}
        repository={repository || ''}
        onComplete={handleClarificationComplete}
        onSkip={() => setShowClarification(false)}
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Issue Preview
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review and edit your generated issue before creating it
        </p>
        {repository && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Target repository: <span className="font-mono">{repository}</span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Original Transcription */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Original Recording
          </h3>

          {audioUrl && (
            <AudioPlayer audioUrl={audioUrl} duration={audioDuration} />
          )}

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transcription:
            </h4>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {transcription}
            </p>
          </div>

          {issue.needs_clarification &&
            issue.needs_clarification.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Needs Clarification:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      {issue.needs_clarification.map((item, index) => (
                        <li
                          key={index}
                          className="text-yellow-700 dark:text-yellow-300 text-sm"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setShowClarification(true)}
                      disabled={isImproving}
                      className="flex items-center space-x-1 text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Answer questions to improve issue</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Generated Issue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generated Issue
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={isImproving}
              className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
              <span className="text-sm">Edit</span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4 relative">
            {isImproving && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Improving issue with clarifications...
                  </p>
                </div>
              </div>
            )}
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedIssue.title}
                  onChange={(e) =>
                    setEditedIssue({ ...editedIssue, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {issue.title}
                </h4>
              )}
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {(isEditing ? editedIssue : issue).labels.map(
                  (label, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        labelColors[label] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {label}
                    </span>
                  )
                )}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    labelColors[(isEditing ? editedIssue : issue).type] ||
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {(isEditing ? editedIssue : issue).type}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    (isEditing ? editedIssue : issue).priority === 'high' ||
                    (isEditing ? editedIssue : issue).priority === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {(isEditing ? editedIssue : issue).priority} priority
                </span>
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={editedIssue.body}
                  onChange={(e) =>
                    setEditedIssue({ ...editedIssue, body: e.target.value })
                  }
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans dark:text-gray-300">
                    {issue.body}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setEditedIssue(issue)
                    setIsEditing(false)
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel Edit
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-white bg-blue-500 dark:bg-blue-600 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onCancel}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={onConfirm}
                  className="flex items-center space-x-2 px-4 py-2 text-white bg-green-500 dark:bg-green-600 rounded-lg hover:bg-green-600 dark:hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Issue</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
