import { produce, type Draft } from 'immer'
import type {
  Clip,
  EngineEvent,
  EngineEventPayload,
  InitialTrackConfig,
  LoadProjectHistory,
  LoadProjectTransport,
  Project,
  TimelineConfig,
  Track,
  TrackKind,
  Transition,
  TransitionKind,
  TransitionEasing,
  TransitionDirection,
} from '../types'
import { generateId } from '../utils/id'
import { getTotalFrames, toFrame, findOverlaps } from '../utils/frames'
import { createTrack, type CreateTrackOptions } from '../track/track'
import { createClip, type CreateClipOptions } from '../elements/base'
import { addClip } from '../visitor/add'
import { removeClip, removeTrack, pruneOrphanedTransitions } from '../visitor/remove'
import { updateClip, updateTrack } from '../visitor/update'
import { splitClip } from '../visitor/split'
import { cloneClip } from '../visitor/clone'

/**
 * A history entry stores the project snapshot before and after a mutation.
 * Because Immer produces structurally-shared objects, only changed nodes
 * allocate new memory — unchanged subtrees are shared by reference.
 * This makes history storage O(diff) not O(project size).
 */
interface HistoryEntry {
  prev: Project
  next: Project
  description: string
}

type Listener<E extends EngineEvent> = (payload: EngineEventPayload[E]) => void

function buildEmptyProject(
  fps: number,
  stage: { width: number; height: number },
  initialTracks: InitialTrackConfig[] | undefined,
  defaultTrackHeight: number,
): Project {
  const specs: InitialTrackConfig[] =
    initialTracks && initialTracks.length > 0
      ? initialTracks
      : [{ kind: 'video', name: 'Track 1' }]

  const tracks = specs.map((spec, order) =>
    createTrack({
      kind: spec.kind,
      name: spec.name,
      order,
      height: spec.height ?? defaultTrackHeight,
      protected: spec.protected,
      pinned: spec.pinned,
    }),
  )

  // Initialize an empty clip array per track so consumers can index `clips[id]`
  // without an undefined check on a brand-new project.
  const clips: Project['clips'] = {}
  for (const track of tracks) clips[track.id] = []

  return {
    id: generateId(),
    fps,
    stage,
    tracks,
    clips,
    transitions: [],
    version: 1,
  }
}

/**
 * TimelineEngine
 *
 * The single source of truth for timeline project state.
 * All mutations go through this class — it applies them via Immer (structural
 * sharing), records history entries for undo/redo, and emits typed events so
 * React stores (or any other subscriber) can stay in sync.
 *
 * Zero React dependency — works in Node.js, Svelte, Vue, or vanilla JS.
 *
 * @example
 * ```ts
 * const engine = new TimelineEngine({ fps: 30 })
 * const track = engine.addTrack('video')
 * engine.addClip({ trackId: track.id, type: 'video', startFrame: 0, durationFrames: 90 })
 * engine.undo()
 * ```
 */
export class TimelineEngine {
  private project: Project
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private readonly maxHistorySize: number
  private readonly defaultTrackHeight: number

  // Transaction state for batch(). When batchDepth > 0, commit() applies
  // mutations to this.project as usual (so subsequent queries see fresh state)
  // but defers the history entry + 'change' / 'history:change' emits until the
  // outermost batch closes. One batch = one undo entry.
  private batchDepth = 0
  private batchPrev: Project | null = null
  private batchDescription: string | null = null

  // Snapshot of the project taken when an interactive gesture (previewClip)
  // begins, so commitInteraction() can record one undo entry for the whole drag.
  private interactionPrev: Project | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<EngineEvent, Set<(payload: any) => void>>()

  constructor(config: TimelineConfig) {
    const stage = config.stage ?? { width: 1080, height: 1920 }
    this.maxHistorySize = config.maxHistorySize ?? 100
    this.defaultTrackHeight = config.defaultTrackHeight ?? 64
    this.project = buildEmptyProject(
      config.fps,
      stage,
      config.initialTracks,
      this.defaultTrackHeight,
    )
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** Returns an immutable snapshot that is replaced on every commit — re-read after edits, never mutate it. */
  getProject(): Project {
    return this.project
  }

  /** Returns undefined for unknown ids — callers decide whether a missing track is an error. */
  getTrack(trackId: string): Track | undefined {
    return this.project.tracks.find((t) => t.id === trackId)
  }

  /** Always sorted by startFrame; returns [] for unknown tracks so callers can iterate without guarding. */
  getClipsOnTrack(trackId: string): Clip[] {
    return this.project.clips[trackId] ?? []
  }

  /** Scans every track for a clip by id alone — use when the caller doesn't know which track holds it. */
  findClip(clipId: string): { clip: Clip; trackId: string } | null {
    for (const [trackId, clips] of Object.entries(this.project.clips)) {
      const clip = clips.find((c) => c.id === clipId)
      if (clip) return { clip, trackId }
    }
    return null
  }

  /** Effective timeline length: the frame where the last clip on any track ends, not a configured value. */
  getTotalFrames(): number {
    return getTotalFrames(this.project.clips)
  }

  /** History is capped, so the oldest edits eventually stop being undoable; track via 'history:change' rather than polling. */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** Any new edit after an undo clears the redo stack, flipping this back to false. */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  // ---------------------------------------------------------------------------
  // Project operations
  // ---------------------------------------------------------------------------

  /**
   * Set the output canvas (stage) dimensions, e.g. switching aspect ratio.
   * Recorded as one undo entry. Clips re-fit to the new stage on the next
   * resolve (no per-clip migration needed — placement is normalized).
   */
  setStage(width: number, height: number): void {
    this.commit((draft) => {
      draft.stage = { width, height }
    }, 'Change aspect ratio')
  }

  /** Set the project-level master volume (linear, 0..2). Persisted with the project. */
  setMasterVolume(value: number): void {
    this.commit((draft) => {
      draft.masterVolume = Math.max(0, Math.min(2, value))
    }, 'Set master volume')
  }

  // ---------------------------------------------------------------------------
  // Track operations
  // ---------------------------------------------------------------------------

  /**
   * Track model: any number of tracks of any kind. Multiple video tracks
   * composite in track order — the resolver derives zIndex from `track.order`
   * (topmost lane draws on top), so overlapping clips on separate video lanes
   * layer rather than conflict.
   *
   * Placement: a new video track slots in directly below the last existing
   * video track (keeping video lanes grouped at the top, above audio/elements);
   * every other kind appends below all existing tracks.
   */
  addTrack(kind: TrackKind, options?: Partial<CreateTrackOptions>): Track {
    const videoOrders = this.project.tracks
      .filter((t) => t.kind === 'video')
      .map((t) => t.order)
    // Bottom-pinned lanes (audio + its generated subtitle lanes, in this
    // product) must stay below every freely-added track. A new pinned track
    // joins that block at the very end (today's plain-append behaviour); a
    // new non-pinned, non-video track inserts just above the block instead
    // of after it, which is the only way "add track" can land between video
    // and a bar that's meant to stay fixed at the bottom. No pinned tracks
    // means this is a no-op — same append-at-end behaviour as before.
    const pinnedOrders = this.project.tracks
      .filter((t) => t.pinned === 'bottom')
      .map((t) => t.order)
    const order =
      kind === 'video' && videoOrders.length > 0
        ? Math.max(...videoOrders) + 1
        : options?.pinned === 'bottom' || pinnedOrders.length === 0
          ? this.project.tracks.length
          : Math.min(...pinnedOrders)

    const track = createTrack({
      kind,
      order,
      height: this.defaultTrackHeight,
      ...options,
    })

    this.commit(
      (draft) => {
        // Make room at the insertion point: everything at or below it shifts
        // down one slot. For plain appends nothing is >= tracks.length, so
        // this is a no-op.
        for (const t of draft.tracks) {
          if (t.order >= track.order) t.order += 1
        }
        draft.tracks.push(track as Draft<Track>)
        draft.tracks.sort((a, b) => a.order - b.order)
        draft.clips[track.id] = []
      },
      `Add ${kind} track`,
    )

    this.emit('track:added', track)
    return track
  }

  /** Removes the track's clips with it, all in a single undo entry. No-op for protected tracks. */
  removeTrack(trackId: string): void {
    const track = this.project.tracks.find((t) => t.id === trackId)
    if (track?.protected) return

    this.commit(
      (draft) => removeTrack(draft, trackId),
      `Remove track`,
    )
    this.emit('track:removed', trackId)
  }

  /** Shallow-merges partial updates; for order changes prefer reorderTracks, which keeps all indices consistent. */
  updateTrack(trackId: string, updates: Partial<Track>): void {
    this.commit(
      (draft) => updateTrack(draft, trackId, updates),
      `Update track`,
    )
  }

  /** Expects the complete id list — tracks omitted from it keep stale order values. */
  reorderTracks(orderedIds: string[]): void {
    this.commit((draft) => {
      orderedIds.forEach((id, index) => {
        const track = draft.tracks.find((t) => t.id === id)
        if (track) track.order = index
      })
      draft.tracks.sort((a, b) => a.order - b.order)
    }, 'Reorder tracks')
  }

  // ---------------------------------------------------------------------------
  // Clip operations
  // ---------------------------------------------------------------------------

  /** Throws if the target track is missing or the clip would overlap an existing one — validate placement first. */
  /**
   * A track flagged `locked` rejects edits to existing clips — remove, move,
   * trim, split — enforced here on the single mutation funnel so every caller
   * (drag handles, keyboard, undo/redo callers) honors it uniformly. Inserting
   * NEW clips (drop / paste) is gated at the UI layer, leaving programmatic
   * `addClip` (demo setup, scripts) unrestricted. Visibility (`disabled`) and
   * `muted` are honored separately by the resolver.
   */
  isTrackLocked(trackId: string): boolean {
    return this.project.tracks.find((t) => t.id === trackId)?.locked ?? false
  }

  addClip(options: CreateClipOptions): Clip {
    const clip = createClip(options)

    this.commit(
      (draft) => addClip(draft, clip),
      `Add ${clip.type} clip`,
    )

    this.emit('clip:added', clip)
    return clip
  }

  /** Transitions referencing the removed clip are pruned in the same undo entry. */
  removeClip(clipId: string, trackId: string): void {
    if (this.isTrackLocked(trackId)) return
    this.commit(
      (draft) => removeClip(draft, clipId, trackId),
      `Remove clip`,
    )
    this.emit('clip:removed', { clipId, trackId })
  }

  /** Positional changes are validated against neighbouring clips and re-sort the track; undoable — use previewClip during gestures. */
  updateClip(clipId: string, trackId: string, updates: Partial<Clip>): void {
    this.commit(
      (draft) => updateClip(draft, clipId, trackId, updates),
      `Update clip`,
    )

    const clip = this.findClip(clipId)?.clip
    if (clip) this.emit('clip:updated', clip)
  }

  /**
   * Live, non-undoable clip mutation for interactive gestures (drag / resize on
   * the preview canvas). Applies immediately and emits 'change' so the preview
   * follows the pointer, but records NO history entry. Call commitInteraction()
   * when the gesture ends to fold every previewClip() since it began into a
   * single undo step. Without that final call the moves are still applied — they
   * just won't be individually undoable, which is the intended behaviour for the
   * intermediate frames of a drag.
   */
  previewClip(clipId: string, trackId: string, updates: Partial<Clip>): void {
    if (this.interactionPrev === null) this.interactionPrev = this.project

    const next = produce(this.project, (draft) =>
      updateClip(draft, clipId, trackId, updates),
    )
    if (next === this.project) return

    this.project = next
    this.emit('change', this.project)
    this.emit('clip:updated', this.findClip(clipId)!.clip)
  }

  /**
   * Close an interaction opened by previewClip(), recording ONE history entry
   * spanning the gesture's start → current state. No-op when no preview ran or
   * the net change was empty (e.g. a click with no drag).
   */
  commitInteraction(description = 'Edit clip'): void {
    const prev = this.interactionPrev
    if (prev === null) return
    this.interactionPrev = null

    const next = this.project
    if (next === prev) return

    this.undoStack.push({ prev, next, description })
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
    this.redoStack = []

    this.emit('history:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    })
  }

  /**
   * Abandon an interaction opened by previewClip(), restoring the project to its
   * pre-gesture snapshot. Emits 'change' so the preview snaps back; records no
   * history. Used for the Escape-to-cancel path of inline text editing.
   */
  cancelInteraction(): void {
    const prev = this.interactionPrev
    if (prev === null) return
    this.interactionPrev = null
    if (this.project !== prev) {
      this.project = prev
      this.emit('change', this.project)
    }
  }

  /**
   * Move a clip to a new position, optionally onto a different track.
   * Rejects silently (no history entry, no event) when the destination range
   * overlaps an existing clip on the target track.
   */
  moveClip(
    clipId: string,
    fromTrackId: string,
    toTrackId: string,
    startFrame: number,
  ): void {
    // A locked source or destination track rejects the move.
    if (this.isTrackLocked(fromTrackId) || this.isTrackLocked(toTrackId)) return

    const fromClips = this.project.clips[fromTrackId]
    if (!fromClips) return

    const clip = fromClips.find((c) => c.id === clipId)
    if (!clip) return

    const newStart = toFrame(startFrame)
    const candidate = { startFrame: newStart, durationFrames: clip.durationFrames }
    const destClips = this.project.clips[toTrackId] ?? []
    // Exclude the clip itself so same-track moves don't self-overlap
    if (findOverlaps(destClips, candidate, clipId).length > 0) return

    this.commit((draft) => {
      const fromClipsDraft = draft.clips[fromTrackId]
      if (!fromClipsDraft) return

      const idx = fromClipsDraft.findIndex((c) => c.id === clipId)
      if (idx === -1) return

      const [movedClip] = fromClipsDraft.splice(idx, 1)
      movedClip.startFrame = newStart
      movedClip.trackId = toTrackId

      if (!draft.clips[toTrackId]) draft.clips[toTrackId] = []
      draft.clips[toTrackId].push(movedClip)
      draft.clips[toTrackId].sort((a, b) => a.startFrame - b.startFrame)

      pruneOrphanedTransitions(draft)
    }, 'Move clip')
  }

  /**
   * Trim a clip's in/out points.
   * Adjusts both timeline position and source trim boundaries.
   *
   * Invariant: a clip's duration cannot exceed its source asset length
   * (sourceDurationFrames). Text clips have no source asset and may grow
   * freely. The cap is enforced here so every caller — drag handles,
   * keyboard shortcuts, scripts, undo/redo — honors it without repeating
   * the rule.
   *
   * Rejects silently (no history entry, no event) when the trimmed range
   * would overlap an existing clip on the same track, or when a left-extend
   * would reach beyond the source's available frames.
   */
  trimClip(
    clipId: string,
    trackId: string,
    startFrame: number,
    durationFrames: number,
  ): void {
    if (this.isTrackLocked(trackId)) return
    // Read from the current project snapshot so we can validate before committing.
    const trackClips = this.project.clips[trackId]
    const existing = trackClips?.find((c) => c.id === clipId)
    if (!existing) return

    const isUnlimited = existing.type === 'text' || existing.type === 'shape' || existing.type === 'freehand'
    // Every timeline frame of a speed-changed clip consumes `speed` source
    // frames, so the source-window invariant becomes durationFrames * speed
    // <= sourceDurationFrames. speed is always 1 for non-video clips (the UI
    // never sets it), so this is a no-op there.
    const speed = existing.speed ?? 1

    const maxDuration = isUnlimited ? Infinity : Math.floor(existing.sourceDurationFrames / speed)
    const clampedDuration = Math.min(maxDuration, Math.max(1, toFrame(durationFrames)))

    // For media clips, the left edge can't extend further left than the source
    // has available frames (i.e., existing.sourceStartFrame / speed timeline
    // frames to the left — at speed=1 this is the original 1:1 relationship).
    // Generated clips (text, shape, freehand) have no source constraint and are always allowed to grow left.
    const rawStart = Math.max(0, toFrame(startFrame))
    const minAllowedStart = isUnlimited
      ? 0
      : Math.max(0, existing.startFrame - Math.floor(existing.sourceStartFrame / speed))
    const newStart = Math.max(minAllowedStart, rawStart)

    // Reject if the trimmed range would overlap another clip on this track.
    const candidate = { startFrame: newStart, durationFrames: clampedDuration }
    if (findOverlaps(trackClips, candidate, clipId).length > 0) return

    // startDelta > 0 → left-edge trim (start moved right); < 0 → left edge moved left
    const startDelta = newStart - existing.startFrame
    // Generated clips have no real source media, skip the source window adjustment.
    const sourceStartFrame = isUnlimited
      ? existing.sourceStartFrame
      : Math.max(0, existing.sourceStartFrame + Math.round(startDelta * speed))

    this.commit((draft) => {
      updateClip(draft, clipId, trackId, {
        startFrame: newStart,
        durationFrames: clampedDuration,
        sourceStartFrame,
      })
      pruneOrphanedTransitions(draft)
    }, 'Trim clip')
  }

  /**
   * Change a video clip's playback speed (e.g. 2x/4x fast-forward, or a
   * slow-down < 1). Video only — clips on this timeline are audio-stripped,
   * so there is no audio time-stretch concern; calling this on a non-video
   * clip is a no-op.
   *
   * Recomputes `durationFrames` atomically with `speed` so the clip's
   * on-timeline length always reflects how much of its trimmed source window
   * it is currently consuming: `round(durationFrames * speed)` stays within
   * `sourceDurationFrames`. `sourceStartFrame` / `sourceDurationFrames`
   * (the trim window into the source, always at 1x) are untouched — only the
   * RATE at which that window is consumed changes.
   *
   * Speeding up (speed > oldSpeed) always shrinks the clip in place — no
   * overlap is possible. Slowing down grows the clip; if that would overlap
   * the next clip on the track, growth is clamped to the gap before it (no
   * ripple — matches trimClip's overlap behavior) rather than growing into it.
   */
  setClipSpeed(clipId: string, trackId: string, speed: number): void {
    if (this.isTrackLocked(trackId)) return
    const trackClips = this.project.clips[trackId]
    const existing = trackClips?.find((c) => c.id === clipId)
    if (!existing || existing.type !== 'video') return

    const clampedSpeed = Math.max(0.25, Math.min(4, speed))
    const oldSpeed = existing.speed ?? 1
    if (clampedSpeed === oldSpeed) return

    const maxDuration = Math.max(1, Math.floor(existing.sourceDurationFrames / clampedSpeed))
    let newDuration = Math.min(
      maxDuration,
      Math.max(1, Math.round((existing.durationFrames * oldSpeed) / clampedSpeed)),
    )

    // Growing (slow-down): never ripple into the next clip — clamp to the
    // gap in front of it instead, mirroring trimClip's silent-reject-via-clamp
    // behavior rather than throwing on overlap.
    if (newDuration > existing.durationFrames) {
      const candidate = { startFrame: existing.startFrame, durationFrames: newDuration }
      const overlaps = findOverlaps(trackClips, candidate, clipId)
      if (overlaps.length > 0) {
        const nearestStart = Math.min(...overlaps.map((c) => c.startFrame))
        newDuration = Math.max(1, nearestStart - existing.startFrame)
      }
    }

    this.commit((draft) => {
      updateClip(draft, clipId, trackId, { speed: clampedSpeed, durationFrames: newDuration })
      pruneOrphanedTransitions(draft)
    }, 'Change clip speed')
  }

  /** The left half keeps the original clip id; returns null when atFrame isn't strictly inside the clip. */
  splitClip(
    clipId: string,
    trackId: string,
    atFrame: number,
  ): [string, string] | null {
    if (this.isTrackLocked(trackId)) return null

    let result: [string, string] | null = null

    this.commit((draft) => {
      result = splitClip(draft, clipId, trackId, atFrame)
      pruneOrphanedTransitions(draft)
    }, 'Split clip')

    if (result) {
      this.emit('clip:split', {
        leftId: result[0],
        rightId: result[1],
        trackId,
      })
    }

    return result
  }

  /** Copies onto the same track at startFrame; returns null instead of throwing when the spot is occupied. */
  cloneClip(
    clipId: string,
    trackId: string,
    startFrame: number,
  ): string | null {
    if (this.isTrackLocked(trackId)) return null

    let newId: string | null = null

    this.commit((draft) => {
      newId = cloneClip(draft, clipId, trackId, startFrame)
    }, 'Clone clip')

    return newId
  }

  // ---------------------------------------------------------------------------
  // Transition operations
  // ---------------------------------------------------------------------------

  /**
   * Add a transition between two adjacent clips on the same track.
   * `durationFrames` is the total transition length; the cut point sits at the
   * midpoint, so each clip contributes half the duration.
   */
  addTransition(options: {
    fromClipId: string
    toClipId: string
    trackId: string
    kind: TransitionKind
    durationFrames: number
    easing?: TransitionEasing
    direction?: TransitionDirection
    /** Shift the transition center from the cut point. Negative = more frames from fromClip. */
    offsetFrames?: number
  }): Transition | null {
    const fromClip = this.project.clips[options.trackId]?.find(
      (c) => c.id === options.fromClipId,
    )
    const toClip = this.project.clips[options.trackId]?.find(
      (c) => c.id === options.toClipId,
    )
    if (!fromClip || !toClip) return null

    const half = Math.max(1, Math.floor(options.durationFrames / 2))
    const offset = options.offsetFrames ?? 0
    const transition: Transition = {
      id: generateId(),
      kind: options.kind,
      fromClipId: options.fromClipId,
      toClipId: options.toClipId,
      trackId: options.trackId,
      startFrame: toClip.startFrame - half + offset,
      durationFrames: half * 2,
      easing: options.easing,
      direction: options.direction,
    }

    this.commit((draft) => {
      draft.transitions.push(transition as Draft<Transition>)
    }, 'Add transition')

    this.emit('transition:added', transition)
    return transition
  }

  removeTransition(transitionId: string): void {
    this.commit((draft) => {
      const idx = draft.transitions.findIndex((t) => t.id === transitionId)
      if (idx !== -1) draft.transitions.splice(idx, 1)
    }, 'Remove transition')
    this.emit('transition:removed', transitionId)
  }

  updateTransition(
    transitionId: string,
    patch: Partial<Pick<Transition, 'kind' | 'durationFrames' | 'easing' | 'direction'>> & {
      /** Shift the transition center from the cut point. Negative = more frames from fromClip. */
      offsetFrames?: number
    },
  ): void {
    const existing = this.project.transitions.find((t) => t.id === transitionId)
    if (!existing) return

    this.commit((draft) => {
      const t = draft.transitions.find((t) => t.id === transitionId)
      if (!t) return
      if (patch.kind !== undefined) t.kind = patch.kind
      if (patch.easing !== undefined) t.easing = patch.easing
      if (patch.direction !== undefined) t.direction = patch.direction
      if (patch.durationFrames !== undefined || patch.offsetFrames !== undefined) {
        const newDuration = patch.durationFrames ?? t.durationFrames
        const half = Math.max(1, Math.floor(newDuration / 2))
        t.durationFrames = half * 2
        const toClipEntry = Object.values(draft.clips)
          .flat()
          .find((c) => c.id === t.toClipId)
        if (toClipEntry) {
          const offset = patch.offsetFrames ?? (t.startFrame - (toClipEntry.startFrame - half))
          t.startFrame = toClipEntry.startFrame - half + offset
        }
      }
    }, 'Update transition')
  }

  // ---------------------------------------------------------------------------
  // Project loading (restore)
  // ---------------------------------------------------------------------------

  /**
   * Replace the whole composition with a stored one.
   *
   * This is the restore half of `getProject()`: what the editor calls when a
   * saved document comes back from the server. It is deliberately *not* an
   * edit —
   *
   *  - **Atomic.** Tracks, clips, transitions, stage, fps and master volume are
   *    swapped in one assignment. No subscriber ever sees the old tracks beside
   *    the new clips, which is the state every `clips[track.id]` lookup in the
   *    app would read as `undefined`.
   *  - **The new baseline.** History is dropped, not appended to. Undo after
   *    opening a project must do nothing; walking back into the empty timeline
   *    that existed for a few milliseconds before the document arrived would
   *    look exactly like losing the project.
   *  - **Stopped at the start.** The playhead belonged to the composition being
   *    replaced. `'project:loaded'` carries the instruction, because
   *    `PlaybackEngine` is a separate object that this one deliberately does not
   *    know about; the composition layer wires the two together
   *    (`EditorProvider`). Pass `transport: 'keep'` for a repair pass that
   *    replaces references inside the composition already on screen, where a
   *    jump to frame 0 would be an unexplained surprise.
   *
   * `project` must already be a valid `Project`. Anything arriving as JSON goes
   * through {@link readProjectDocument} first — that is where an unreadable or
   * too-new document is refused, and it is separate from this method so the
   * refusal can be shown to the user before the editor's contents are thrown
   * away.
   *
   * An in-progress `batch()` or drag is abandoned rather than merged: both
   * describe edits to a composition that no longer exists.
   *
   * **`history: 'keep'` is the exception, and only one caller has it.** The
   * media re-link (`relinkProjectMedia`) does not bring a new composition — it
   * hands back the one already on screen with internal library references
   * repaired, and it lands whenever the project's assets finish importing,
   * which can be long after the open. Everything above stops being true for it:
   * there is no earlier composition to protect undo from, the user's edits since
   * the open are real history, and an open drag is a real gesture that still has
   * a `commitInteraction()` coming. So that call keeps the stacks, the
   * interaction snapshot and any open batch intact. (Entries already on the
   * stacks still hold the pre-repair references; undoing past the repair costs a
   * filmstrip, not work — and those ids are session-scoped anyway.)
   */
  loadProject(
    project: Project,
    options?: { transport?: LoadProjectTransport; history?: LoadProjectHistory },
  ): void {
    if (options?.history !== 'keep') {
      this.batchDepth = 0
      this.batchPrev = null
      this.batchDescription = null
      this.interactionPrev = null
      this.undoStack = []
      this.redoStack = []
    }

    this.project = project

    // 'change' first, so anything that re-reads the engine from
    // 'project:loaded' (the transport reset does) sees stores already synced to
    // the composition it is resetting for.
    this.emit('change', this.project)
    this.emit('history:change', { canUndo: this.canUndo(), canRedo: this.canRedo() })
    this.emit('project:loaded', {
      project: this.project,
      transport: options?.transport ?? 'rewind',
    })
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  /**
   * Group multiple engine mutations into a single undo entry.
   *
   * Inside the recipe, every public mutation method (addClip, splitClip, …)
   * still applies normally — `this.project` is kept up-to-date so reads
   * between mutations are correct — but the per-call history entries and
   * 'change' events are suppressed. When the outermost batch closes, one
   * history entry covering prev → final is pushed and one 'change' fires.
   *
   * Nested batch() calls collapse into the outermost transaction.
   * If the recipe throws, the project rolls back to its pre-batch snapshot
   * and the error re-throws.
   *
   * @example
   * engine.batch(() => {
   *   engine.removeClip(a, t)
   *   engine.addClip({ ... })
   * }, 'Replace clip')
   */
  batch(recipe: () => void, description?: string): void {
    if (this.batchDepth === 0) {
      this.batchPrev = this.project
      this.batchDescription = description ?? null
    }
    this.batchDepth++

    try {
      recipe()
    } catch (err) {
      this.batchDepth = Math.max(0, this.batchDepth - 1)
      if (this.batchDepth === 0) {
        // Roll back any partial mutations from inner commits — unless a
        // loadProject inside the recipe already replaced the composition those
        // mutations belonged to, in which case there is nothing to roll back to.
        if (this.batchPrev !== null) this.project = this.batchPrev
        this.batchPrev = null
        this.batchDescription = null
      }
      throw err
    }

    // Clamped rather than decremented: a loadProject inside the recipe resets
    // the depth, and a negative one would make the *next* batch think it is
    // nested inside a transaction that no longer exists.
    this.batchDepth = Math.max(0, this.batchDepth - 1)
    if (this.batchDepth > 0) return // nested batch — wait for outermost

    const prev = this.batchPrev
    const next = this.project
    const desc = this.batchDescription ?? 'Batch'
    this.batchPrev = null
    this.batchDescription = null

    // The transaction was abandoned by a restore. Recording an entry now would
    // put `undo` one step away from a composition that was thrown away — and
    // with no snapshot to return to, that step leads nowhere at all.
    if (prev === null) return

    if (next === prev) return // no net change — nothing to record

    const entry: HistoryEntry = { prev, next, description: desc }
    this.undoStack.push(entry)
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
    this.redoStack = []

    this.emit('change', this.project)
    this.emit('history:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    })
  }

  // ---------------------------------------------------------------------------
  // History (undo / redo)
  // ---------------------------------------------------------------------------

  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry) return false

    this.redoStack.push(entry)
    this.project = entry.prev

    this.emit('change', this.project)
    this.emit('history:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    })

    return true
  }

  redo(): boolean {
    const entry = this.redoStack.pop()
    if (!entry) return false

    this.undoStack.push(entry)
    this.project = entry.next

    this.emit('change', this.project)
    this.emit('history:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    })

    return true
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on<E extends EngineEvent>(event: E, listener: Listener<E>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  off<E extends EngineEvent>(event: E, listener: Listener<E>): void {
    this.listeners.get(event)?.delete(listener)
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * Apply a mutation via Immer, record the history entry, and emit 'change'.
   * All public mutations funnel through here — never mutate this.project directly.
   *
   * When called from inside a batch(), the mutation is still applied to
   * this.project (so subsequent reads inside the batch are correct) but the
   * history push and 'change' / 'history:change' emits are deferred to the
   * outer batch.
   */
  private commit(
    recipe: (draft: Draft<Project>) => void,
    description: string,
  ): void {
    const prev = this.project
    const next = produce(prev, recipe)

    if (next === prev) return // Immer detected no change — nothing to record

    this.project = next

    if (this.batchDepth > 0) {
      if (this.batchDescription === null) this.batchDescription = description
      return
    }

    const entry: HistoryEntry = { prev, next, description }

    this.undoStack.push(entry)
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
    this.redoStack = []

    this.emit('change', this.project)
    this.emit('history:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    })
  }

  private emit<E extends EngineEvent>(
    event: E,
    payload: EngineEventPayload[E],
  ): void {
    this.listeners.get(event)?.forEach((fn) => fn(payload))
  }
}
