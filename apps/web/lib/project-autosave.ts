/**
 * The pure half of the editor's autosave: when to save, and what to do when the
 * store refuses. `LocalProjectBridge` owns the engine subscription and the
 * write itself — a synchronous `localStorage` adapter (see
 * `lib/local-project.ts`) — while every *decision* lives here, where vitest can
 * hold it still (`lib/` is the only tree the run covers).
 *
 * `save` is version-aware so a versioned store can be plugged in, but the local
 * adapter pins the version at 0 and never rejects with a conflict. The conflict
 * path is kept because rules 1 and 2 describe it and the tests exercise it.
 *
 * The rules this file exists to enforce, in order of how expensive they are to
 * get wrong:
 *
 *  1. **Never two saves in flight.** A versioned store is guarded by a document
 *     version, and the version only moves when a save *returns*. Two overlapping
 *     writes would send the same version twice and the second would conflict
 *     against work the user never conflicted with. Edits made during a save are
 *     held and saved once it lands.
 *  2. **A conflict stops the loop.** It means somebody else's version is
 *     stored; retrying with the same stale version would conflict forever.
 *     Saving is suspended until the caller reloads the latest document and
 *     calls `resume` with the new version.
 *  3. **Debounce, don't throttle.** A drag emits a change per commit. The timer
 *     restarts on each one, so a save lands once the user pauses rather than
 *     every few seconds mid-gesture.
 *  4. **Never save back what the store just gave us.** Opening a project
 *     restores its document into the engine, and the engine announces that the
 *     same way it announces an edit. Without a baseline, every open would write
 *     the document straight back. See {@link Autosave.rebase}.
 */

/**
 * Long enough that a continuous edit gesture saves once, short enough that
 * closing the tab a moment after the last edit is safe. Spec §4.4 asks for a
 * debounced save; 2.5s is the middle of the 2–3s that read as "instant".
 */
export const AUTOSAVE_DEBOUNCE_MS = 2_500

export type AutosaveStatus =
  /** Nothing edited since the document was opened or last saved. */
  | { kind: 'idle' }
  /** Edits are pending and the debounce timer is running. */
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  /** The store holds a newer version. Saving is suspended until `resume`. */
  | { kind: 'conflict' }
  /** A write failure. The next edit retries. */
  | { kind: 'error'; message: string }

/**
 * Thrown by a `save` callback when the store holds a newer version than the
 * one sent. The local `localStorage` adapter never throws it (one writer, one
 * key); it exists so a versioned adapter has a way to say "stale".
 */
export class AutosaveConflictError extends Error {
  constructor(message = 'The stored document is newer than the one being saved.') {
    super(message)
    this.name = 'AutosaveConflictError'
  }
}

/** A stale-version rejection, as opposed to any other failure. */
export function isVersionConflict(err: unknown): boolean {
  return err instanceof AutosaveConflictError
}

/** Injectable timer, so tests drive the debounce instead of waiting it out. */
export interface AutosaveScheduler {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

const REAL_SCHEDULER: AutosaveScheduler = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export interface AutosaveOptions<D> {
  /** The version the document being edited was read at. */
  version: number
  /**
   * The document the server is already holding — what was just restored into
   * the editor. A `schedule` of this exact document writes nothing. See
   * {@link Autosave.rebase} for why identity, not equality.
   */
  baseline?: D | null
  /** Performs the write. Resolves with the version the server moved to. */
  save: (document: D, version: number) => Promise<{ documentVersion: number }>
  onStatus: (status: AutosaveStatus) => void
  debounceMs?: number
  now?: () => number
  scheduler?: AutosaveScheduler
}

export interface Autosave<D> {
  /**
   * Record an edit. Restarts the debounce; a no-op while suspended by a
   * conflict, and a no-op for a document identical to the current baseline.
   */
  schedule(document: D): void
  /** Save right now if anything is pending. Resolves once the write settles. */
  flush(): Promise<void>
  /**
   * Declare a document as *already stored*, so scheduling it saves nothing.
   *
   * Called when something other than the user put content into the editor: the
   * initial restore, the reload-after-conflict, and the media re-link that
   * repairs a restored composition's library references. All three make the
   * engine announce a change that is not an edit.
   *
   * Identity, not deep equality, is the comparison. The engine's project is
   * immutable and rebuilt by Immer on every commit, so a real edit always
   * produces a different object and an announcement that changed nothing always
   * produces the same one. That makes the check exact and O(1) — where a deep
   * compare of every clip on every keystroke would be neither.
   */
  rebase(document: D): void
  /** Clear the conflict and carry on from the version the page just re-read. */
  resume(version: number): void
  /** Stop scheduling. A save already in flight is left to finish — it is a write. */
  dispose(): void
  /** The version the next save will send. Exposed for assertions, not for callers to set. */
  readonly version: number
}

export function createAutosave<D>(options: AutosaveOptions<D>): Autosave<D> {
  const {
    save,
    onStatus,
    debounceMs = AUTOSAVE_DEBOUNCE_MS,
    now = Date.now,
    scheduler = REAL_SCHEDULER,
  } = options

  let version = options.version
  let baseline: D | null = options.baseline ?? null
  let timer: unknown = null
  let pending: { document: D } | null = null
  let inFlight = false
  let suspended = false
  let disposed = false

  const setStatus = (status: AutosaveStatus) => onStatus(status)

  const clearTimer = () => {
    if (timer === null) return
    scheduler.clear(timer)
    timer = null
  }

  const armTimer = () => {
    clearTimer()
    timer = scheduler.set(() => {
      timer = null
      void run()
    }, debounceMs)
  }

  async function run(): Promise<void> {
    // Rule 1: one write at a time. Whatever is pending is picked up by the
    // `pending` re-arm at the end of this call.
    if (inFlight || suspended || disposed || !pending) return

    const document = pending.document
    pending = null
    inFlight = true
    setStatus({ kind: 'saving' })

    try {
      const result = await save(document, version)
      version = result.documentVersion
      // What was just written is what the server holds; re-announcing it (the
      // engine emits on undo/redo too) must not queue a second identical PUT.
      baseline = document
      // A `dispose` mid-write must not report a state onto an unmounted page.
      if (!disposed) setStatus({ kind: 'saved', at: now() })
    } catch (err) {
      if (isVersionConflict(err)) {
        // Rule 2: stop. The pending edit is kept so a reload-and-reapply flow
        // still has it, but nothing is sent until `resume`.
        suspended = true
        if (!disposed) setStatus({ kind: 'conflict' })
        return
      }
      if (!disposed) {
        setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Save failed.' })
      }
      // Put the edit back so the next change (or flush) retries it rather than
      // dropping work because the network blinked.
      pending = { document }
    } finally {
      inFlight = false
    }

    // An edit that arrived while this write was open. Debounced again rather
    // than sent immediately: the user is probably still editing.
    if (pending && !suspended && !disposed) armTimer()
  }

  return {
    schedule(document: D) {
      if (disposed) return
      // Rule 4. Nothing changed, so there is nothing to say either — reporting
      // 'dirty' here would flash "Unsaved changes" over a project the user has
      // not touched.
      if (document === baseline) return
      pending = { document }
      if (suspended) return
      setStatus({ kind: 'dirty' })
      if (!inFlight) armTimer()
    },

    async flush() {
      if (disposed || suspended || !pending) return
      clearTimer()
      await run()
    },

    rebase(document: D) {
      if (disposed) return
      baseline = document
      // A change already queued for this exact document was the restore's own
      // announcement arriving before this call. Dropping it is the point.
      if (pending && pending.document === document) {
        pending = null
        clearTimer()
        // Not 'saved': no save happened. 'idle' reads as "All changes saved",
        // which is true — the server has this document.
        if (!inFlight && !suspended) setStatus({ kind: 'idle' })
      }
    },

    resume(nextVersion: number) {
      if (disposed) return
      version = nextVersion
      suspended = false
      // A reload replaced the document on screen, so whatever was pending was
      // built on the version that just lost. Dropping it is the point of the
      // reload — keeping it would re-apply the work the user chose to discard.
      pending = null
      clearTimer()
      setStatus({ kind: 'idle' })
    },

    dispose() {
      disposed = true
      clearTimer()
      pending = null
    },

    get version() {
      return version
    },
  }
}
