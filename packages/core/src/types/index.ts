/**
 * All shared types for @elah/editor.
 * Time is always represented as integer frame counts — never float seconds.
 * FPS is a project-level constant stored in Project.fps.
 */

/** An exact frame position. Always a non-negative integer. */
export type FrameCount = number

/**
 * Entry/exit animation styles available to text and shape clips.
 *
 * `fade` drives opacity only. `spin` and the four `slide-*` kinds drive the
 * clip's `Transform` (rotation / position) and leave opacity untouched.
 * The human-readable option list for UI pickers is
 * `TEXT_ANIMATION_KINDS` in `resolver/textAnimation.ts` — a `Record` keyed by
 * this union, so it cannot drift from it.
 */
export type TextAnimationKind =
  | 'fade'
  | 'spin'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'

/**
 * Entry/exit animation descriptor. Used by both `Clip.textAnimation` and
 * `Clip.shapeAnimation` — the two fields share this one shape.
 *
 * Resolved by `sampleTextAnimation` (see `resolver/textAnimation.ts`) into the
 * two channels every renderer already understands: an opacity ramp and, for the
 * kinds that move or rotate the clip, a concrete `Transform` that replaces the
 * clip's authored one for the frames the ramp covers. Renderers stay
 * animation-unaware, so GPU/export parity is automatic.
 */
/**
 * Easing curves available to a `MotionSpec`.
 *
 * `quad-in` / `quad-out` are the curves the enum animation kinds have always
 * used, kept so the legacy path is expressible in the new model rather than
 * living beside it.
 *
 * `back-*` and `elastic-out` OVERSHOOT — they return values outside 0..1 partway
 * through. That is the point: overshoot is most of what reads as deliberate
 * motion design rather than a linear slide. It also means any channel driven by
 * them must tolerate passing its target and coming back, which is fine for
 * position/rotation/scale and is why opacity is clamped at the point of use.
 */
export type TextAnimationEasing =
  | 'linear'
  | 'quad-in'
  | 'quad-out'
  | 'quad-in-out'
  | 'cubic-out'
  | 'expo-out'
  | 'back-in'
  | 'back-out'
  | 'elastic-out'
  | 'bounce-out'

/**
 * One end of a layered animation: the state the clip is in at the FAR end of
 * its ramp, with the near end always being the clip's authored resting state.
 *
 * Rest is structurally fixed — opacity 1, zero offset, scale multiplier 1, zero
 * rotation delta — so only the extreme is stored. Encoding both ends would allow
 * a spec whose "to" is not rest, i.e. a clip that never reaches the state the
 * author set in the properties panel, which is a bug generator rather than a
 * feature.
 *
 * Read direction differs per end, and that asymmetry mirrors how the two ramps
 * actually work:
 *   in  — the clip STARTS at the extreme and arrives at rest as the ramp closes.
 *   out — the clip starts at rest and DEPARTS to the extreme.
 *
 * Every field is optional; an omitted channel is left at rest and contributes
 * nothing, so a spec only describes what it actually animates.
 */
export interface MotionSpec {
  /** Opacity at the extreme, 0..1. Rest is 1. Omitted = no opacity ramp. */
  opacity?: number
  /** Horizontal offset from rest at the extreme, normalized 0..1 of stage width. */
  offsetX?: number
  /** Vertical offset from rest at the extreme, normalized 0..1 of stage height. */
  offsetY?: number
  /**
   * Scale MULTIPLIER at the extreme, applied on top of the clip's authored
   * scale. 0.8 = starts (or ends) at 80% of whatever size the author chose.
   * A multiplier rather than an absolute so a template never fights the scale
   * slider. Rest is 1.
   */
  scale?: number
  /** Rotation delta from rest at the extreme, in radians. Positive = clockwise. */
  rotation?: number
  /**
   * Curve for the geometric channels (offset, scale, rotation).
   * Defaults to `quad-out` on an entry and `quad-in` on an exit — an entry
   * decelerating into place and an exit accelerating away, which is what the
   * enum kinds have always done.
   */
  ease?: TextAnimationEasing
  /**
   * Curve for opacity, kept separate because it usually wants to stay linear
   * while the geometry overshoots. Defaults to `linear`, which is both the
   * video convention for a cross-fade and what every already-authored project
   * was written against.
   */
  opacityEase?: TextAnimationEasing
}

export interface TextAnimation {
  in?: TextAnimationKind
  out?: TextAnimationKind
  /** Duration of the in/out ramp in frames (shared by both directions) */
  durationFrames: number
  /**
   * Layered entry motion. When present this REPLACES whatever `in` names —
   * the enum is resolved into a `MotionSpec` internally, so the two are the
   * same machinery and this is simply the expressive form of it.
   *
   * Lets a single end drive several channels at once (fade AND rise AND scale),
   * which the one-kind-per-end enum cannot express. Written by text templates;
   * the properties panel's Entry/Exit selects still write `in` / `out`.
   */
  inMotion?: MotionSpec
  /** Layered exit motion. Replaces `out` when present. See `inMotion`. */
  outMotion?: MotionSpec
}

/**
 * Spatial transform applied to a clip at render time.
 * All values are normalized so they remain resolution-independent.
 */
export interface Transform {
  /** Horizontal position, normalized 0..1 relative to stage width */
  x: number
  /** Vertical position, normalized 0..1 relative to stage height */
  y: number
  /** Uniform scale factor; 1 = native size */
  scale: number
  /** Rotation in radians; positive = clockwise */
  rotation: number
  /** Anchor point within the clip's own bounding box, normalized 0..1 */
  anchor: { x: number; y: number }
  /**
   * Extra horizontal stretch multiplied on top of `scale`. Omitted means 1, so
   * every transform written before free resize existed stays uniform.
   */
  scaleX?: number
  /** Extra vertical stretch multiplied on top of `scale`. Omitted means 1. */
  scaleY?: number
}

export type ClipType = 'video' | 'audio' | 'text' | 'image' | 'shape' | 'freehand'

/** Variant of the 'shape' clip — determines which SVG primitive is rendered. */
export type ShapeVariant = 'rect' | 'circle' | 'triangle'

export type TrackKind = 'video' | 'audio' | 'elements'

/**
 * A single clip placed on the timeline.
 * startFrame + durationFrames define its position and length on the timeline.
 * sourceStartFrame + sourceDurationFrames define the trim window into the source.
 * Use `transform` to position / scale / rotate the clip in the stage coordinate space.
 */
export interface Clip {
  id: string
  trackId: string
  type: ClipType
  name: string

  /** Position on the timeline (frame where this clip starts) */
  startFrame: FrameCount
  /** How many frames this clip occupies on the timeline */
  durationFrames: FrameCount

  /** Trim in-point into the source asset */
  sourceStartFrame: FrameCount
  /** Length of the source asset (used for trim constraints) */
  sourceDurationFrames: FrameCount

  /** Source URL for video / audio / image clips */
  src?: string
  /**
   * Optional reference to a MediaAsset in the MediaLibrary. When set, the
   * renderer prefers this lookup over `src`. Both can coexist during
   * the migration to an assetId-only model.
   */
  assetId?: string
  /** Text content for text clips */
  content?: string

  // --- Text style (text clips only; all optional, the TextLayer applies defaults) ---
  /** Glyph size in stage-space pixels */
  fontSize?: number
  /** CSS color string for the glyphs */
  color?: string
  /** CSS font-family */
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  /** CSS color string for the box painted behind the glyphs. Undefined = no background. */
  backgroundColor?: string
  /** Opacity of `backgroundColor`, 0–1. Default 1. */
  backgroundOpacity?: number
  /** Space in stage-space pixels between the glyphs and the background/border box. */
  padding?: number
  /** Corner radius of the background/border box, in stage-space pixels. */
  borderRadius?: number
  /** Stroke width of the box border, in stage-space pixels. 0 (or omitted) = no border. */
  borderWidth?: number
  /** CSS color string for the box border. */
  borderColor?: string

  // --- Shape style (shape clips only) ---
  /** Which SVG primitive to render */
  shapeKind?: ShapeVariant
  /** CSS color string for the shape fill */
  shapeFill?: string
  /** CSS color string for the shape stroke */
  shapeStroke?: string
  /** Stroke width in stage-space pixels */
  shapeStrokeWidth?: number

  // --- Freehand style (freehand clips only) ---
  /** SVG path data string (the 'd' attribute value) */
  pathData?: string
  /** CSS color string for the stroke */
  strokeColor?: string
  /** Stroke width in stage-space pixels */
  strokeWidth?: number

  volume?: number   // 0 – 1
  opacity?: number  // 0 – 1
  /**
   * Playback speed multiplier for VIDEO clips only (audio clips on this
   * timeline are stripped of audio, so no time-stretch is needed). 1 = normal
   * speed (default when omitted). Clamped to [0.25, 4] by TimelineEngine's
   * setClipSpeed(). Changing it recomputes `durationFrames` so the clip's
   * on-timeline length reflects the new speed while `sourceStartFrame` /
   * `sourceDurationFrames` continue to describe the trim window into the
   * source asset at 1x. See resolveTimeline.ts for how this maps timeline
   * frames to source frames, and ExportWorker.ts for how export honors it.
   */
  speed?: number
  /**
   * Rounded-corner mask for video/image clips, as a fraction 0..0.5 of the
   * *shorter* rendered side. 0 (or omitted) = square corners; 0.5 = a full
   * ellipse, which on a square draw rect is a circle.
   */
  cornerRadius?: number
  /**
   * Source-space crop window, normalized 0..1 of the media's natural size,
   * origin top-left. Omitted = the full frame. Video/image clips only.
   */
  crop?: { x: number; y: number; width: number; height: number }
  locked?: boolean
  disabled?: boolean
  /** Optional spatial transform; undefined means the renderer applies its own default */
  transform?: Transform
  /** Entry/exit animation for text clips */
  textAnimation?: TextAnimation
  /** Entry/exit animation for shape clips */
  shapeAnimation?: TextAnimation
}

/** A track lane that holds clips */
export interface Track {
  id: string
  name: string
  kind: TrackKind
  /** Render order: lower = closer to top of timeline */
  order: number
  /** Height in pixels */
  height: number
  locked: boolean
  disabled: boolean
  muted: boolean
  solo: boolean
  /** Linear gain multiplier for the track, 0..2. Default 1 (unity). */
  volume?: number
  /** When true, the track cannot be removed by the user. */
  protected?: boolean
  /**
   * When `'bottom'`, `addTrack` keeps this lane (and any other pinned-bottom
   * lane) below every non-pinned track rather than appending new tracks
   * after it — the Descript-style layout where video sits on top, freely
   * added tracks land in the middle, and a fixed audio+subtitle bar stays at
   * the very bottom regardless of insertion order.
   */
  pinned?: 'bottom'
}

/**
 * The full project state. This is the engine's source of truth.
 * Passed to Immer for structural-sharing mutations.
 * `stage` defines the output canvas dimensions; defaults to 1080×1920 (portrait).
 */
export interface Project {
  id: string
  /** Frames per second — integer (e.g. 24, 30, 60) */
  fps: number
  /** Output canvas dimensions in pixels */
  stage: { width: number; height: number }
  tracks: Track[]
  /** clips indexed by trackId, sorted by startFrame */
  clips: Record<string, Clip[]>
  transitions: Transition[]
  version: number
  /** Linear master gain for all audio output, 0..2. Default 1 (unity). */
  masterVolume?: number
}

/** A track to create up-front when the engine is constructed. */
export interface InitialTrackConfig {
  kind: TrackKind
  /** Display name; falls back to a kind-based default when omitted. */
  name?: string
  /** Height in pixels; falls back to the engine's defaultTrackHeight when omitted. */
  height?: number
  /** When true, the track cannot be removed by the user. */
  protected?: boolean
  /** See `Track.pinned`. */
  pinned?: 'bottom'
}

/** Config passed when creating a TimelineEngine instance */
export interface TimelineConfig {
  fps: number
  /** Output canvas dimensions; defaults to 1080×1920 (portrait) */
  stage?: { width: number; height: number }
  /** Default height for new tracks in pixels */
  defaultTrackHeight?: number
  /** Max undo steps kept in history */
  maxHistorySize?: number
  /**
   * Tracks created in the empty project before any user edits. When omitted,
   * a single "Track 1" video track is created (backwards-compatible default).
   * Pass an explicit list for a fixed-lane editor (e.g. video / audio / text).
   */
  initialTracks?: InitialTrackConfig[]
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export type TransitionKind = 'fade' | 'slide' | 'wipe'
export type TransitionEasing = 'linear' | 'ease-in' | 'ease-out'
export type TransitionDirection = 'left' | 'right' | 'up' | 'down'

/**
 * A transition between two adjacent clips on the same track.
 * startFrame marks where the transition begins (before the cut point).
 * The cut is at startFrame + durationFrames / 2 (centered).
 * Both clips are rendered simultaneously during [startFrame, startFrame + durationFrames).
 *
 * Adding a new transition kind = handle it in resolveTimeline (opacity/scene) and
 * TransitionOverlay (CSS). Everything else is plug-and-play.
 */
export interface Transition {
  id: string
  kind: TransitionKind
  fromClipId: string
  toClipId: string
  trackId: string
  /** Frame where the transition begins. = toClip.startFrame - durationFrames / 2 */
  startFrame: FrameCount
  durationFrames: FrameCount
  direction?: TransitionDirection
  easing?: TransitionEasing
}

/** Events emitted by TimelineEngine */
export type EngineEvent =
  | 'change'
  | 'track:added'
  | 'track:removed'
  | 'clip:added'
  | 'clip:removed'
  | 'clip:updated'
  | 'clip:split'
  | 'transition:added'
  | 'transition:removed'
  | 'history:change'
  | 'project:loaded'

/**
 * What the playhead should do when a composition is loaded.
 *
 * `'rewind'` — opening or reloading a document: stop and return to frame 0,
 * because the frame the user was on belonged to a composition that is gone.
 * `'keep'` — a repair pass over the composition already on screen (see
 * `relinkProjectMedia`), where moving the playhead would be an unexplained
 * jump the user did not ask for.
 */
export type LoadProjectTransport = 'rewind' | 'keep'

/**
 * What undo/redo should do when a composition is loaded.
 *
 * `'reset'` — an open or a reload: the document that just arrived *is* the
 * history's starting point, and ctrl+Z must not walk back into the empty
 * timeline that existed before it landed.
 * `'keep'` — a repair pass over the composition already on screen (see
 * `relinkProjectMedia`), which lands an unpredictable stretch of time after the
 * open. By then the user may have trimmed a clip, added a title, or be
 * mid-drag; throwing their undo stack away to swap an internal reference would
 * be a loss they never asked for and cannot explain.
 */
export type LoadProjectHistory = 'reset' | 'keep'

export interface ProjectLoadedEvent {
  project: Project
  transport: LoadProjectTransport
}

export type EngineEventPayload = {
  change: Project
  'track:added': Track
  'track:removed': string
  'clip:added': Clip
  'clip:removed': { clipId: string; trackId: string }
  'clip:updated': Clip
  'clip:split': { leftId: string; rightId: string; trackId: string }
  'transition:added': Transition
  'transition:removed': string
  'history:change': { canUndo: boolean; canRedo: boolean }
  'project:loaded': ProjectLoadedEvent
}
