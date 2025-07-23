import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts'

interface ProcessAudioRequest {
  audioUrl: string
  audioDuration: number
  repository: string
  clarificationMode?: boolean
  context?: {
    originalTranscription?: string
    question?: string
    previousAnswers?: Record<string, string>
  }
}

serve(async (req) => {
  // Get origin from request
  const origin = req.headers.get('Origin')
  const headers = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request
    const request: ProcessAudioRequest = await req.json()
    const { audioUrl, audioDuration, repository, clarificationMode, context } =
      request

    if (!audioUrl || !repository) {
      throw new Error('Missing required fields: audioUrl, repository')
    }

    // Check repository permissions
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!adminUser) {
      const { data: permission, error: permError } = await supabaseClient
        .from('repository_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('repository_full_name', repository)
        .eq('can_create_issues', true)
        .single()

      if (permError || !permission) {
        throw new Error(
          `You don't have permission to create issues in ${repository}`
        )
      }
    }

    // Download audio file from storage
    const audioPath = audioUrl.split('/').slice(-2).join('/')
    const { data: audioData, error: downloadError } =
      await supabaseClient.storage.from('voice-recordings').download(audioPath)

    if (downloadError || !audioData) {
      throw new Error('Failed to download audio file')
    }

    // Convert Blob to File for FormData
    const audioFile = new File([audioData], 'audio.webm', {
      type: 'audio/webm',
    })

    // Call Whisper API for transcription
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    // Language will be auto-detected by Whisper
    formData.append('response_format', 'json')

    const whisperResponse = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: formData,
      }
    )

    if (!whisperResponse.ok) {
      const error = await whisperResponse.text()
      throw new Error(`Whisper API error: ${error}`)
    }

    const { text: transcription } = await whisperResponse.json()

    if (!transcription) {
      throw new Error('No transcription received from Whisper')
    }

    // Different processing for clarification mode
    if (clarificationMode) {
      // Just return the transcription for clarification answers
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transcription,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Call GPT-4o for issue generation
    const systemMessage = context?.originalTranscription
      ? `You are improving a GitHub issue based on clarification answers.
      
      Original transcription: "${context.originalTranscription}"
      
      Clarification answers have been provided. Use them to create an improved issue with:
      1. A clear, actionable title
      2. A detailed description incorporating the clarifications
      3. Well-defined requirements and acceptance criteria
      4. Appropriate labels and priority
      
      Respond in JSON format.`
      : `You are an expert at creating structured GitHub issues from voice transcriptions.
      
      Analyze the transcription and create a well-structured issue with:
      1. A clear, actionable title
      2. A detailed description with context, requirements, and acceptance criteria
      3. Appropriate labels based on the content
      4. Priority level (low, medium, high, critical)
      5. Issue type (feature, bug, enhancement, task, etc.)
      
      If the transcription is unclear or missing important details, include a "needs_clarification" field with specific questions.
      
      Respond in JSON format.`

    const userMessage = context?.previousAnswers
      ? `Original transcription: "${transcription}"\n\nClarification answers:\n${JSON.stringify(context.previousAnswers, null, 2)}`
      : `Create a GitHub issue from this voice transcription: "${transcription}"`

    const gptResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      }
    )

    if (!gptResponse.ok) {
      const error = await gptResponse.text()
      throw new Error(`GPT-4o API error: ${error}`)
    }

    const gptData = await gptResponse.json()
    const issue = JSON.parse(gptData.choices[0].message.content)

    // Log the processing
    await supabaseClient.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'audio_processed',
      target_user_id: user.id,
      repository_full_name: repository,
      details: {
        audio_duration: audioDuration,
        transcription_length: transcription.length,
        issue_title: issue.title,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transcription,
          issue,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Audio processing error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    )
  }
})
