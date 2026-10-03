/**
 * FrameSequenceController — transport + pointer-drag over a FrameSequence.
 *
 * Framework-agnostic and **per-instance**: unlike the project stores, nothing
 * here is module-scoped, so any number of sequences can run on one page
 * independently. That is what lets several 360° viewers coexist where only one
 * `<EditorProvider>` can.
 *
 * Playback is not reimplemented. The controller owns a `PlaybackEngine` — the
 * same anchor-and-integrate clock the editor's transport uses — so autoplay
 * gets the RAF loop, the integer-frame notify guard, and the tab-visibility
 * handling for free, and behaves identically to the timeline.
 *
 * Subscription contract mirrors PlaybackEngine's (snapshot + epoch) and the
 * snapshot object is reference-stable between changes, so React can bind it
 * with `useSyncExternalStore` and no adapter.
 */

import { PlaybackEngine } from '../playback/PlaybackEngine'
import { normalizeFrameIndex, type FrameSequence, type FrameLoopMode } from './frameSequence'

export interface FrameSequenceSnapshot {
  /** Current frame index, always valid for the current sequence. */
  index: number
  isPlaying: boolean
  /** True between beginDrag() and endDrag(). Viewers use it for cursor state. */
  isDragging: boolean
  /** Bumped on every emitted change, so consumers can detect same-value events. */
  epoch: number
}

export interface FrameSequenceControllerOptions {
  sequence: FrameSequence
  /** Overrides `sequence.fps` for playback. */
  fps?: number
  /** Overrides `sequence.loop`. */
  loop?: FrameLoopMode
  /** Starting index. Normalized. Defaults to 0. */
  initialIndex?: number
  /**
   * Frames traversed per full drag across the viewer's width.
   *
   * The default of 1 means one full-width drag moves through the whole
   * sequence exactly once, which keeps the gesture feeling the same on a phone
   * and a 4K monitor — the alternative (fixed px-per-frame) makes a wide
   * viewer feel sluggish and a narrow one feel twitchy.
   */
  dragSensitivity?: number
  /** Injectable clock for deterministic tests, forwarded to PlaybackEngine. */
  now?: () => number
}

type Listener = (snapshot: FrameSequenceSnapshot) => void

/** Fallback px-per-frame before the viewer has reported its width. */
const UNMEASURED_PIXELS_PER_FRAME = 8

export class FrameSequenceController {
  private sequence: FrameSequence
  private playback: PlaybackEngine
  private listeners = new Set<Listener>()

  private _index: number
  private _dragging = false
  private _epoch = 0
  private _dragSensitivity: number

  /**
   * Cached, reference-stable snapshot. Rebuilt only in `emit()`, because
   * `useSyncExternalStore` re-renders forever if `getSnapshot()` returns a
   * fresh object on every call.
   */
  private _snapshot: FrameSequenceSnapshot

  /** Viewer width in px, set by the view layer. Drives pixels-per-frame. */
  private _viewportWidth = 0
  /** Pointer x at the last drag sample. */
  private _dragOriginX = 0
  /**
   * Fractional index accumulated during a drag. Kept as a float and rounded
   * only when emitting, so slow drags still advance instead of rounding to
   * zero on every move and going nowhere.
   */
  private _dragFloatIndex = 0

  /** Null while detached — see `detach()`/`reattach()`. */
  private unsubscribePlayback: (() => void) | null

  constructor(options: FrameSequenceControllerOptions) {
    this.sequence = options.loop
      ? { ...options.sequence, loop: options.loop }
      : options.sequence
    this._dragSensitivity = options.dragSensitivity ?? 1
    this._index = normalizeFrameIndex(this.sequence, options.initialIndex ?? 0)

    this.playback = new PlaybackEngine({
      fps: options.fps ?? this.sequence.fps,
      // The clock counts 0..n-1 and the result is re-mapped through
      // normalizeFrameIndex, so wrap and pingpong both ride one linear counter.
      getTotalFrames: () => Math.max(this.sequence.frames.length, 1),
      ...(options.now ? { now: options.now } : {}),
    })
    // PlaybackEngine's own loop halts at the end; keep the clock running and
    // let normalizeFrameIndex decide what reaching the end means.
    this.playback.setLoop(true)
    this.playback.seek(this._index)

    this._snapshot = {
      index: this._index,
      isPlaying: false,
      isDragging: false,
      epoch: 0,
    }

    this.unsubscribePlayback = this.subscribeToPlayback()
  }

  /**
   * Link the clock to the index. Extracted from the constructor so `reattach()`
   * can restore it — the subscription is the only thing making playback move
   * the frame, and losing it yields a controller that reports `isPlaying` while
   * the index never advances.
   */
  private subscribeToPlayback(): () => void {
    return this.playback.subscribe((snapshot) => {
      // The pointer outranks the clock while a drag is in flight.
      if (this._dragging) return
      const next = normalizeFrameIndex(this.sequence, snapshot.currentFrame)
      const playingChanged = snapshot.isPlaying !== this._snapshot.isPlaying
      if (next === this._index && !playingChanged) return
      this._index = next
      this.emit()
    })
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  get index(): number {
    return this._index
  }

  get isPlaying(): boolean {
    return this.playback.isPlaying
  }

  get isDragging(): boolean {
    return this._dragging
  }

  get currentSequence(): FrameSequence {
    return this.sequence
  }

  /** Reference-stable between changes — safe for `useSyncExternalStore`. */
  getSnapshot(): FrameSequenceSnapshot {
    return this._snapshot
  }

  // ── Transport ────────────────────────────────────────────────────────────

  play(): void {
    if (this.playback.isPlaying) return
    this.playback.play()
    this.emit()
  }

  pause(): void {
    if (!this.playback.isPlaying) return
    this.playback.pause()
    this.emit()
  }

  toggle(): void {
    if (this.playback.isPlaying) this.pause()
    else this.play()
  }

  /** Jump to `index`, normalized by the loop mode. */
  seek(index: number): void {
    const next = normalizeFrameIndex(this.sequence, index)
    const changed = next !== this._index
    // Assign before touching the clock: `playback.seek` notifies synchronously,
    // and the subscriber above compares against `this._index`. Setting it first
    // makes that callback a no-op, so one seek emits exactly once.
    this._index = next
    this.playback.seek(next)
    if (changed) this.emit()
  }

  next(): void {
    this.seek(this._index + 1)
  }

  prev(): void {
    this.seek(this._index - 1)
  }

  setLoop(loop: FrameLoopMode): void {
    if (loop === this.sequence.loop) return
    this.sequence = { ...this.sequence, loop }
    // Re-normalize: an index valid under 'wrap' can be out of range under a
    // mode with different end behaviour.
    this._index = normalizeFrameIndex(this.sequence, this._index)
    this.emit()
  }

  /**
   * Swap the sequence in place, keeping the transport running. Used by an
   * industry/variant switcher that changes what is shown without tearing down
   * the viewer.
   */
  setSequence(sequence: FrameSequence, opts: { preserveIndex?: boolean } = {}): void {
    this.sequence = sequence
    this._index = normalizeFrameIndex(sequence, opts.preserveIndex ? this._index : 0)
    this.playback.seek(this._index)
    this.emit()
  }

  // ── Drag ─────────────────────────────────────────────────────────────────

  /** Told by the view layer whenever the viewer is measured or resized. */
  setViewportWidth(width: number): void {
    this._viewportWidth = Math.max(0, width)
  }

  setDragSensitivity(sensitivity: number): void {
    this._dragSensitivity = sensitivity
  }

  /**
   * Px of pointer travel per one frame of index change.
   *
   * Derived from the viewer width so the gesture is viewport-independent (see
   * `dragSensitivity`). Falls back to a fixed step before the first measure.
   */
  private pixelsPerFrame(): number {
    const count = Math.max(this.sequence.frames.length, 1)
    const span = count * this._dragSensitivity
    if (this._viewportWidth <= 0 || span <= 0) return UNMEASURED_PIXELS_PER_FRAME
    return this._viewportWidth / span
  }

  beginDrag(clientX: number): void {
    // A drag is a deliberate takeover of the transport; autoplay must yield or
    // the clock would fight the pointer.
    if (this.playback.isPlaying) this.playback.pause()
    this._dragging = true
    this._dragOriginX = clientX
    this._dragFloatIndex = this._index
    this.emit()
  }

  /**
   * Sample the pointer. Emits only when the integer index actually changes, so
   * a 120 Hz pointer stream does not become 120 React renders per second.
   */
  drag(clientX: number): void {
    if (!this._dragging) return
    const deltaPx = clientX - this._dragOriginX
    this._dragOriginX = clientX
    // Drag right → index increases → the subject appears to rotate one way.
    this._dragFloatIndex += deltaPx / this.pixelsPerFrame()

    const next = normalizeFrameIndex(this.sequence, this._dragFloatIndex)
    if (next === this._index) return
    this._index = next
    this.emit()
  }

  endDrag(): void {
    if (!this._dragging) return
    this._dragging = false
    // Hand the resolved position back to the clock so a later play() resumes
    // from where the drag ended rather than from a stale anchor.
    this.playback.seek(this._index)
    this.emit()
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Release the clock and any document listeners, leaving the controller
   * usable. Reversible via `reattach()`.
   *
   * This pair exists because a React effect cleanup is *not* proof of unmount:
   * StrictMode runs setup → cleanup → setup against one memoized controller,
   * and any remount does the same. Tearing the clock down irreversibly there
   * (as `destroy()` does) left the transport reporting `isPlaying` while the
   * frame index sat frozen, because nothing ever re-subscribed.
   */
  detach(): void {
    this.unsubscribePlayback?.()
    this.unsubscribePlayback = null
    this.playback.detach()
  }

  /** Restore what `detach()` released. Safe to call when already attached. */
  reattach(): void {
    if (this.unsubscribePlayback) return
    this.playback.attach()
    this.unsubscribePlayback = this.subscribeToPlayback()
  }

  destroy(): void {
    this.detach()
    this.playback.destroy()
    this.listeners.clear()
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private emit(): void {
    this._epoch++
    this._snapshot = {
      index: this._index,
      isPlaying: this.playback.isPlaying,
      isDragging: this._dragging,
      epoch: this._epoch,
    }
    const snapshot = this._snapshot
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot)
      } catch {
        // One broken listener must not stall the sequence.
      }
    })
  }
}
