const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found in environment variables')
}

interface TransformationResult {
  title: string
  body: string
  labels: string[]
  type: 'feature' | 'bug' | 'enhancement' | 'task'
  priority: 'low' | 'medium' | 'high' | 'critical'
  needs_clarification?: string[]
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  // Language will be auto-detected by Whisper
  formData.append('response_format', 'text')

  try {
    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Transcription failed')
    }

    const transcription = await response.text()
    return transcription.trim()
  } catch (error) {
    console.error('Transcription error:', error)
    throw error
  }
}

export async function transformToIssue(
  transcription: string,
  context: { repository: string; language?: string }
): Promise<TransformationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  const systemPrompt = `You are an expert at creating GitHub issues from spoken requirements.

Task: Transform the following voice recording into a structured GitHub issue.

Rules:
- Extract a concise title (max 80 characters)
- Structure the description with Markdown
- Identify the issue type (Feature, Bug, Enhancement, Task)
- Suggest appropriate labels
- Identify acceptance criteria if possible
- Retain important technical details
- Write professionally but keep the core message
- If something is unclear, list it under "needs_clarification"
- IMPORTANT: Write the issue in the SAME LANGUAGE as the transcription

Repository: ${context.repository}

Respond ONLY with valid JSON in the following format:
{
  "title": "Short, concise title",
  "body": "## Description\\n\\nDetailed description...\\n\\n## Requirements\\n- ...\\n\\n## Acceptance Criteria\\n- [ ] ...",
  "labels": ["label1", "label2"],
  "type": "feature|bug|enhancement|task",
  "priority": "low|medium|high|critical",
  "needs_clarification": ["Unclear point 1", "Unclear point 2"]
}`

  const userPrompt = `Transcription: ${transcription}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Transformation failed')
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)

    return result as TransformationResult
  } catch (error) {
    console.error('Transformation error:', error)
    throw error
  }
}
