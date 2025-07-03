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
  formData.append('language', 'de') // German, but auto-detection will work too
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

  const systemPrompt = `Du bist ein Experte für das Erstellen von GitHub Issues aus gesprochenen Anforderungen.

Aufgabe: Transformiere die folgende Sprachaufnahme in ein strukturiertes GitHub Issue.

Regeln:
- Extrahiere einen prägnanten Titel (max 80 Zeichen)
- Strukturiere die Beschreibung mit Markdown
- Erkenne den Issue-Typ (Feature, Bug, Enhancement, Task)
- Schlage passende Labels vor
- Identifiziere Akzeptanzkriterien wenn möglich
- Behalte wichtige technische Details
- Formuliere professionell aber behalte die Kernaussage
- Wenn etwas unklar ist, liste es unter "needs_clarification"

Repository: ${context.repository}

Antworte ausschließlich mit validem JSON im folgenden Format:
{
  "title": "Kurzer, prägnanter Titel",
  "body": "## Beschreibung\\n\\nDetaillierte Beschreibung...\\n\\n## Anforderungen\\n- ...\\n\\n## Akzeptanzkriterien\\n- [ ] ...",
  "labels": ["label1", "label2"],
  "type": "feature|bug|enhancement|task",
  "priority": "low|medium|high|critical",
  "needs_clarification": ["Unklarer Punkt 1", "Unklarer Punkt 2"]
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
