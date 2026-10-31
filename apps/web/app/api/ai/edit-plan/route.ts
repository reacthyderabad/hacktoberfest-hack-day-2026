import { NextResponse, type NextRequest } from 'next/server'
import type {
  TimelineContextSnapshot,
  StudioEditPlan,
  ApiHistoryEntry,
} from '@/lib/ai/studioTypes'

// ─── JSON Schema ─────────────────────────────────────────────────────────────

const ACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'title', 'description', 'params'],
  properties: {
    id: { type: 'string' },
    type: {
      type: 'string',
      enum: [
        'add_text',
        'add_subtitle',
        'trim_clip',
        'split_clip',
        'delete_clip',
        'move_clip',
        'add_transition',
        'add_audio',
        'set_speed',
        'mute_clip',
        'set_aspect',
      ],
    },
    title: { type: 'string' },
    description: { type: 'string' },
    params: {
      type: 'object',
      additionalProperties: false,
      properties: {
        clipId: { type: 'string' },
        trackId: { type: 'string' },
        toTrackId: { type: 'string' },
        text: { type: 'string' },
        fontSize: { type: 'number' },
        color: { type: 'string' },
        position: { type: 'string', enum: ['center', 'lower_third', 'top_banner'] },
        startFrame: { type: 'number' },
        durationFrames: { type: 'number' },
        atFrame: { type: 'number' },
        transitionKind: { type: 'string', enum: ['fade', 'slide', 'wipe'] },
        speed: { type: 'number' },
        muted: { type: 'boolean' },
        audioSrc: { type: 'string' },
        audioName: { type: 'string' },
        aspect: { type: 'string', enum: ['16:9', '9:16', '1:1'] },
      },
    },
  },
}

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'explanation', 'actions'],
  properties: {
    summary: { type: 'string' },
    explanation: { type: 'string' },
    unsupported: { type: 'string' },
    actions: {
      type: 'array',
      items: ACTION_SCHEMA,
    },
  },
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(context: TimelineContextSnapshot): string {
  const trackList = context.tracks
    .map((t) => {
      const clips = t.clips
        .map((c) => `    - clip id="${c.id}" name="${c.name ?? 'unnamed'}" type=${c.type} start=${c.startFrame}f dur=${c.durationFrames}f`)
        .join('\n')
      return `  track id="${t.id}" kind=${t.kind} name="${t.name}":\n${clips || '    (empty)'}`
    })
    .join('\n')

  return `You are the AI video-editing assistant inside Elah Studio AI.
Your job is to translate natural-language editing requests into validated, structured JSON editing plans.

## Timeline state (current)
- FPS: ${context.fps}
- Stage: ${context.stage.width}×${context.stage.height}
- Current frame: ${context.currentFrame}
- Total frames: ${context.totalFrames}
- Selected clip IDs: ${context.selectedClipIds.length ? context.selectedClipIds.join(', ') : 'none'}

## Tracks and Clips
${trackList}

## Available action types
| type           | required params                                        |
|----------------|--------------------------------------------------------|
| add_text       | trackId, text, startFrame, durationFrames, position, fontSize, color |
| add_subtitle   | trackId, text, startFrame, durationFrames              |
| trim_clip      | clipId, trackId, startFrame, durationFrames            |
| split_clip     | clipId, trackId, atFrame                               |
| delete_clip    | clipId, trackId                                        |
| move_clip      | clipId, trackId, toTrackId, startFrame                 |
| add_transition | trackId, transitionKind (fade|slide|wipe), durationFrames |
| set_speed      | clipId, trackId, speed (0.25–4.0)                     |
| mute_clip      | clipId, trackId, muted                                |
| set_aspect     | aspect (16:9 | 9:16 | 1:1)                            |

## Rules
1. Use ONLY clip IDs and track IDs that exist in the timeline state above.
2. If you cannot resolve actual IDs (e.g. "the first clip"), choose the earliest clip of the appropriate type.
3. Convert seconds → frames using the FPS value.
4. If the request is genuinely impossible (e.g. "export to DaVinci", "add subtitles from SRT file") or ambiguous beyond resolution, set actions=[] and fill the "unsupported" field explaining why.
5. Never invent clip or track IDs that do not exist.
6. Never propose JavaScript execution, DOM manipulation, or arbitrary code.
7. Respond ONLY with valid JSON matching the schema. No prose outside JSON.`
}

// ─── Validate plan ────────────────────────────────────────────────────────────

function isValidPlan(plan: unknown): plan is StudioEditPlan {
  if (!plan || typeof plan !== 'object') return false
  const p = plan as Record<string, unknown>
  if (typeof p.summary !== 'string') return false
  if (typeof p.explanation !== 'string') return false
  if (!Array.isArray(p.actions)) return false
  const VALID_TYPES = new Set([
    'add_text', 'add_subtitle', 'trim_clip', 'split_clip', 'delete_clip',
    'move_clip', 'add_transition', 'add_audio', 'set_speed', 'mute_clip', 'set_aspect',
  ])
  for (const a of p.actions as unknown[]) {
    if (!a || typeof a !== 'object') return false
    const act = a as Record<string, unknown>
    if (typeof act.id !== 'string') return false
    if (!VALID_TYPES.has(act.type as string)) return false
    if (typeof act.title !== 'string') return false
    if (typeof act.description !== 'string') return false
    if (!act.params || typeof act.params !== 'object') return false
  }
  return true
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { prompt?: string; context?: TimelineContextSnapshot; history?: ApiHistoryEntry[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt.' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      hasServerKey: false,
      message: 'Server has no OPENAI_API_KEY configured; client will use local planner.',
    })
  }

  const context: TimelineContextSnapshot = body.context ?? {
    fps: 30, currentFrame: 0, totalFrames: 0,
    stage: { width: 1920, height: 1080 },
    tracks: [], selectedClipIds: [],
  }

  // Build message array (system + up to 10 previous turns + current user turn)
  const history = (body.history ?? []).slice(-10)
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: prompt },
  ]

  try {
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'edit_plan',
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!openAiRes.ok) {
      const errData = await openAiRes.json().catch(() => ({}))
      const msg = (errData as { error?: { message?: string } })?.error?.message
        || `OpenAI returned HTTP ${openAiRes.status}`
      return NextResponse.json({ hasServerKey: true, error: msg, fallbackToLocal: true })
    }

    const data = await openAiRes.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ hasServerKey: true, error: 'Empty response from OpenAI.', fallbackToLocal: true })
    }

    let plan: unknown
    try {
      plan = JSON.parse(content)
    } catch {
      return NextResponse.json({ hasServerKey: true, error: 'AI response was not valid JSON.', fallbackToLocal: true })
    }

    if (!isValidPlan(plan)) {
      return NextResponse.json({ hasServerKey: true, error: 'AI response did not match expected schema.', fallbackToLocal: true })
    }

    return NextResponse.json({ hasServerKey: true, plan })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Planning request failed.'
    // Distinguish timeouts from other errors
    const isTimeout = msg.includes('timeout') || msg.includes('abort')
    return NextResponse.json(
      {
        hasServerKey: true,
        error: isTimeout ? 'AI request timed out (20s). Using local planner.' : msg,
        fallbackToLocal: true,
      },
      { status: isTimeout ? 504 : 500 },
    )
  }
}
