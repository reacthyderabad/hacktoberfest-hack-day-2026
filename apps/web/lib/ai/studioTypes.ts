/**
 * Structured types for Elah Studio AI editing operations, plans,
 * and the conversational AI assistant.
 */

// ─── Action Types ───────────────────────────────────────────────────────────

export type StudioActionType =
  | 'add_text'
  | 'add_subtitle'
  | 'trim_clip'
  | 'split_clip'
  | 'delete_clip'
  | 'move_clip'
  | 'add_transition'
  | 'add_audio'
  | 'set_speed'
  | 'set_aspect'
  | 'mute_clip'

export interface StudioEditAction {
  id: string
  type: StudioActionType
  title: string
  description: string
  params: {
    clipId?: string
    trackId?: string
    toTrackId?: string
    text?: string
    fontSize?: number
    color?: string
    position?: 'center' | 'lower_third' | 'top_banner'
    startFrame?: number
    durationFrames?: number
    atFrame?: number
    transitionKind?: 'fade' | 'slide' | 'wipe'
    speed?: number
    muted?: boolean
    audioSrc?: string
    audioName?: string
    aspect?: '16:9' | '9:16' | '1:1'
  }
}

// ─── Edit Plan ──────────────────────────────────────────────────────────────

export interface StudioEditPlan {
  summary: string
  explanation: string
  actions: StudioEditAction[]
  /** Present when the AI cannot fulfill the request */
  unsupported?: string
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface PlanValidationResult {
  valid: boolean
  /** Human-readable warnings about invalid / missing params */
  warnings: string[]
  /** Actions that are safe to apply (unresolvable params removed) */
  safeActions: StudioEditAction[]
}

// ─── Timeline Context ────────────────────────────────────────────────────────

export interface TimelineContextSnapshot {
  fps: number
  currentFrame: number
  totalFrames: number
  stage: { width: number; height: number }
  tracks: {
    id: string
    kind: 'video' | 'audio' | 'elements'
    name: string
    clips: {
      id: string
      name?: string
      type: string
      startFrame: number
      durationFrames: number
    }[]
  }[]
  selectedClipIds: string[]
}

// ─── Conversational Message Thread ──────────────────────────────────────────

export type ConvRole = 'user' | 'assistant'

/** One turn in the conversation thread */
export interface ConvMessage {
  id: string
  role: ConvRole
  text: string
  /** Timestamp (ms since epoch) */
  ts: number
  /** Structured plan attached to this assistant message, if any */
  plan?: StudioEditPlan
  /** Validation result for the plan, if any */
  validation?: PlanValidationResult
  /** Whether this plan was applied, rejected, or is pending */
  planStatus?: 'pending' | 'applied' | 'rejected'
  /** True if the AI declared this instruction unsupported */
  isUnsupported?: boolean
  /** True if we fell back to local planner (no live AI key) */
  isLocalFallback?: boolean
}

// ─── Server API types ────────────────────────────────────────────────────────

/** Serialisable history entry sent to the server */
export interface ApiHistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

export interface EditPlanRequest {
  prompt: string
  context: TimelineContextSnapshot
  /** Previous turns (up to last N) for multi-turn context */
  history: ApiHistoryEntry[]
}

export interface EditPlanResponse {
  hasServerKey: boolean
  plan?: StudioEditPlan
  fallbackToLocal?: boolean
  error?: string
  message?: string
}
