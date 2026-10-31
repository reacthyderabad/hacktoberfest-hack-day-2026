import {
  ProjectDocumentError,
  readProjectDocument,
  type Project as EditorDocument,
  type ProjectDocumentErrorCode,
} from '@elah/editor'

/**
 * The standalone editor's storage: the composition on `/editor` kept in
 * `localStorage` so a refresh doesn't empty the timeline.
 *
 * A reload would otherwise throw the work away without ever having said it
 * wouldn't be kept. The engine's `Project` is already plain JSON, so the whole
 * of it is what gets written.
 *
 * The decisions live here rather than in the component because `lib/` is the
 * only tree vitest covers, and the two that matter are worth pinning:
 *
 *  - **A stored blob this build can't read is never written over.** It is
 *    copied to a backup key first, and only then does the editor carry on with
 *    an empty timeline. Refusing to parse is not a reason to destroy — the
 *    document may open in the tab that wrote it, or in the next build.
 *  - **Storage failing is never fatal.** Private-mode `localStorage` throws on
 *    access, and a full origin throws on write. Either way the editor still
 *    works; it just doesn't remember. Losing the session is bad, refusing to
 *    open the editor at all is worse.
 *
 * The document format is the raw `Project`. It already carries `version`
 * (`PROJECT_VERSION`), and `readProjectDocument` already owns the versioning,
 * repair and refusal rules — a wrapper here would be a second scheme saying the
 * same thing, and one of the two would eventually be wrong.
 */

/** Follows the `myeditor-*` convention set by `playback.store` and the theme. */
export const LOCAL_PROJECT_KEY = 'myeditor-local-project'

/**
 * Where an unreadable document goes before the editor moves on without it.
 *
 * Not shown anywhere. It exists so the answer to "the editor forgot my work" is
 * recoverable from devtools rather than gone, which is the whole difference
 * between a bug and a data loss.
 */
export const LOCAL_PROJECT_BACKUP_KEY = 'myeditor-local-project-backup'

/**
 * The slice of `Storage` this module uses, so tests can hand it a `Map` — the
 * app's vitest run (`apps/web/vitest.config.ts`) is a node environment with
 * no `localStorage` at all.
 */
export type LocalProjectStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * What the stored blob turns into.
 *
 * Three outcomes, because two of them put the same empty timeline on screen and
 * only one of them is safe to overwrite.
 */
export type LocalRestore =
  /** Nothing stored yet. The empty editor is the truth; the first edit stores it. */
  | { kind: 'empty' }
  | { kind: 'ready'; project: EditorDocument }
  | { kind: 'refused'; reason: ProjectDocumentErrorCode }

/**
 * `window.localStorage`, or `null` when there isn't one to use.
 *
 * Two separate failures, both real: the module is imported during Next's server
 * render where `window` doesn't exist, and reading the `localStorage` property
 * itself *throws* (not returns null) in Safari private browsing and under a
 * third-party-storage block. Hence the try/catch around what looks like a plain
 * property read.
 */
export function localStorageOrNull(): LocalProjectStore | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Read the stored composition back.
 *
 * Total, like `readProjectDocument` itself: every failure — absent key, invalid
 * JSON, a document from a newer build — comes back as one of the three kinds
 * rather than a throw, because the caller is a mount effect and there is no
 * useful way for it to fail.
 */
export function readLocalProject(
  store: LocalProjectStore,
  options: { defaultTrackHeight: number },
): LocalRestore {
  let raw: string | null
  try {
    raw = store.getItem(LOCAL_PROJECT_KEY)
  } catch {
    // A storage that throws on read is a storage with nothing in it as far as
    // this editor is concerned.
    return { kind: 'empty' }
  }

  if (raw === null || raw.length === 0) return { kind: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Truncated by a quota failure mid-write, or edited by hand. Either way it
    // is not this build's to interpret — and not this build's to delete.
    return { kind: 'refused', reason: 'unreadable' }
  }

  try {
    return {
      kind: 'ready',
      // A track whose stored height is missing lands on the same height the
      // rest of this editor's lanes use, rather than the engine's bare default.
      project: readProjectDocument(parsed, { defaultTrackHeight: options.defaultTrackHeight }),
    }
  } catch (err) {
    return {
      kind: 'refused',
      reason: err instanceof ProjectDocumentError ? err.code : 'unreadable',
    }
  }
}

/**
 * Write the composition, and say whether it landed.
 *
 * `false` is a normal outcome, not an exception: the origin's quota is shared
 * with everything else on it, and a composition with a few hundred clips is the
 * one thing here big enough to hit it. The caller keeps editing either way.
 */
export function writeLocalProject(store: LocalProjectStore, project: EditorDocument): boolean {
  try {
    store.setItem(LOCAL_PROJECT_KEY, JSON.stringify(project))
    return true
  } catch {
    // QuotaExceededError, or a storage that refuses writes entirely.
  }
  return false
}

/**
 * Move a document this build can't open out of the way, so the editor can carry
 * on writing without destroying it.
 *
 * Best-effort by design — if even the copy fails there is nothing further to
 * try, and throwing here would take down the mount effect that called it. The
 * main key is deliberately left alone: it is overwritten by the next edit, and
 * until then it is the second copy.
 */
export function backupUnreadableLocalProject(store: LocalProjectStore): void {
  try {
    const raw = store.getItem(LOCAL_PROJECT_KEY)
    if (raw === null) return
    store.setItem(LOCAL_PROJECT_BACKUP_KEY, raw)
  } catch {
    // Nothing to fall back to, and nothing lost that wasn't already unreadable.
  }
}
