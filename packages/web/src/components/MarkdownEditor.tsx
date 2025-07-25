import { useState, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Link,
  Heading1,
  Heading2,
  Quote,
  Eye,
  Edit,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

interface ToolbarButton {
  icon: React.ReactNode
  title: string
  action: () => void
  isActive?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  className,
  minHeight = '200px',
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Insert markdown syntax
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)

    const newText =
      text.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      text.substring(end)

    onChange(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Insert list item
  const insertListItem = (marker: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = textarea.value

    // Find the start of the current line
    let lineStart = start
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--
    }

    const newText =
      text.substring(0, lineStart) + marker + ' ' + text.substring(lineStart)

    onChange(newText)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = lineStart + marker.length + 1
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Toolbar buttons
  const toolbarButtons: ToolbarButton[] = [
    {
      icon: <Bold className="h-4 w-4" />,
      title: 'Bold (Ctrl+B)',
      action: () => insertMarkdown('**', '**'),
    },
    {
      icon: <Italic className="h-4 w-4" />,
      title: 'Italic (Ctrl+I)',
      action: () => insertMarkdown('*', '*'),
    },
    {
      icon: <Heading1 className="h-4 w-4" />,
      title: 'Heading 1',
      action: () => insertMarkdown('# '),
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      title: 'Heading 2',
      action: () => insertMarkdown('## '),
    },
    {
      icon: <List className="h-4 w-4" />,
      title: 'Bullet List',
      action: () => insertListItem('-'),
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      title: 'Numbered List',
      action: () => insertListItem('1.'),
    },
    {
      icon: <Quote className="h-4 w-4" />,
      title: 'Quote',
      action: () => insertMarkdown('> '),
    },
    {
      icon: <Code className="h-4 w-4" />,
      title: 'Inline Code',
      action: () => insertMarkdown('`', '`'),
    },
    {
      icon: <Link className="h-4 w-4" />,
      title: 'Link',
      action: () => insertMarkdown('[', '](url)'),
    },
    {
      icon: <Minus className="h-4 w-4" />,
      title: 'Horizontal Rule',
      action: () => insertMarkdown('\n---\n'),
    },
  ]

  // Handle keyboard shortcuts
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault()
            insertMarkdown('**', '**')
            break
          case 'i':
            e.preventDefault()
            insertMarkdown('*', '*')
            break
          case 'k':
            e.preventDefault()
            insertMarkdown('[', '](url)')
            break
        }
      }
    }

    textarea.addEventListener('keydown', handleKeyDown)
    return () => textarea.removeEventListener('keydown', handleKeyDown)
  }, [insertMarkdown])

  // Simple markdown to HTML converter
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let inCodeBlock = false
    let codeLines: string[] = []

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={index}
              className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto"
            >
              <code className="text-sm text-gray-800 dark:text-gray-200">
                {codeLines.join('\n')}
              </code>
            </pre>
          )
          codeLines = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        codeLines.push(line)
        return
      }

      // Headers
      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={index}
            className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100"
          >
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={index}
            className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100"
          >
            {line.substring(2)}
          </h1>
        )
      }
      // Horizontal rule
      else if (line === '---') {
        elements.push(
          <hr
            key={index}
            className="my-4 border-gray-300 dark:border-gray-600"
          />
        )
      }
      // Lists
      else if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
        elements.push(
          <li
            key={index}
            className="ml-6 list-disc text-gray-700 dark:text-gray-300"
          >
            {processInlineMarkdown(line.replace(/^-\s|^\d+\.\s/, ''))}
          </li>
        )
      }
      // Quotes
      else if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={index}
            className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400"
          >
            {processInlineMarkdown(line.substring(2))}
          </blockquote>
        )
      }
      // Normal paragraph
      else if (line.trim()) {
        elements.push(
          <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
            {processInlineMarkdown(line)}
          </p>
        )
      } else {
        elements.push(<br key={index} />)
      }
    })

    return elements
  }

  // Process inline markdown (bold, italic, code, links)
  const processInlineMarkdown = (text: string): (string | JSX.Element)[] => {
    const elements: (string | JSX.Element)[] = []
    let remaining = text
    let key = 0

    // Process bold
    remaining = remaining.replace(/\*\*(.+?)\*\*/g, (_, content) => {
      elements.push(<strong key={key++}>{content}</strong>)
      return '___PLACEHOLDER_' + (elements.length - 1) + '___'
    })

    // Process italic
    remaining = remaining.replace(/\*(.+?)\*/g, (_, content) => {
      elements.push(<em key={key++}>{content}</em>)
      return '___PLACEHOLDER_' + (elements.length - 1) + '___'
    })

    // Process inline code
    remaining = remaining.replace(/`(.+?)`/g, (_, content) => {
      elements.push(
        <code
          key={key++}
          className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm"
        >
          {content}
        </code>
      )
      return '___PLACEHOLDER_' + (elements.length - 1) + '___'
    })

    // Process links
    remaining = remaining.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
      elements.push(
        <a
          key={key++}
          href={url}
          className="text-blue-600 dark:text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {text}
        </a>
      )
      return '___PLACEHOLDER_' + (elements.length - 1) + '___'
    })

    // Split by placeholders and reconstruct
    const parts = remaining.split('___PLACEHOLDER_')
    const result: (string | JSX.Element)[] = []

    parts.forEach((part, i) => {
      if (i % 2 === 0) {
        if (part) result.push(part)
      } else {
        const elementIndex = parseInt(part)
        if (!isNaN(elementIndex) && elements[elementIndex]) {
          result.push(elements[elementIndex])
        }
      }
    })

    return result.length > 0 ? result : [text]
  }

  return (
    <div
      className={cn(
        'border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-2 py-1 flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button, index) => (
            <button
              key={index}
              type="button"
              onClick={button.action}
              title={button.title}
              className={cn(
                'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                'text-gray-700 dark:text-gray-300',
                button.isActive && 'bg-gray-200 dark:bg-gray-700'
              )}
              disabled={showPreview}
            >
              {button.icon}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          {showPreview ? (
            <>
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </>
          )}
        </button>
      </div>

      {/* Editor/Preview */}
      <div style={{ minHeight }}>
        {showPreview ? (
          <div className="p-4 prose dark:prose-invert max-w-none">
            {value.trim() ? (
              renderMarkdown(value)
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Nothing to preview
              </p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none"
            style={{ minHeight }}
          />
        )}
      </div>

      {/* Help text */}
      {!showPreview && (
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 px-3 py-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supports Markdown: **bold**, *italic*, `code`, [links](url), #
            headers, - lists
          </p>
        </div>
      )}
    </div>
  )
}
